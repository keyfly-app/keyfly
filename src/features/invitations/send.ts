import "server-only";
import { getLocale } from "next-intl/server";
import { CONTACT } from "@/config/company";
import { isLocale, type Locale } from "@/i18n/config";
import { ADDRESS_COLUMNS, addressFromRow, streetLine } from "@/lib/address";
import { requestOrigin } from "@/lib/request-origin";
import { resendFetch } from "@/lib/resend";
import { hrefFor, type AppSite } from "@/lib/sites";
import type { Enums } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { topicOf, topicOn } from "@/features/notifications/prefs";
import { leaseTenantEmail, occupantEmail, staffEmail, teamMemberEmail, type Email } from "./emails";

/** Staff invitations are valid for 48 hours (create_staff_invitation). */
const STAFF_INVITATION_VALID_HOURS = 48;

/** Whether a Keyfly user with this address switched the email's topic off (Értesítések). Unknown addresses get everything. */
async function switchedOff(to: string, category: string): Promise<boolean> {
  const topic = topicOf(category);
  if (!topic) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin.from("profiles").select("email_prefs").ilike("email", to.replace(/[\\%_]/g, "\\$&")).maybeSingle();
  return data ? !topicOn(data.email_prefs, topic) : false;
}

/**
 * Sends one transactional email through Resend. Never throws; returns whether it was handed over.
 * A topic the recipient switched off counts as handled (true): nothing to resend.
 */
export async function sendEmail(to: string, email: Email, category: string): Promise<boolean> {
  if (await switchedOff(to, category)) return true;
  try {
    const response = await resendFetch("/emails", {
      method: "POST",
      body: {
        from: CONTACT.transactionalFrom,
        to: [to],
        reply_to: CONTACT.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [{ name: "category", value: category }],
      },
    });
    if (!response) return false;
    if (!response.ok) console.error("email failed", category, response.status);
    return response.ok;
  } catch (error) {
    console.error("email failed", category, error instanceof Error ? error.message : "unknown error");
    return false;
  }
}

/** Absolute link on an app surface, for emails ("https://app.keyfly.app/invite/…" or the preview equivalent). */
export async function appUrl(site: AppSite, path: string): Promise<string> {
  const { origin, host } = await requestOrigin();
  return `${origin}${hrefFor(site, path, host)}`;
}

/** Emails go out in the language of the person who sends the invitation. */
export async function senderLocale(): Promise<Locale> {
  const raw = await getLocale();
  return isLocale(raw) ? raw : "hu";
}

/** The signed-in user's name for "X invited you" (falls back to the email address). */
export async function myDisplayName(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return "";
  // Filter by id: staff (with 2FA) may read every profile, so an unfiltered single() would fail for them.
  const { data } = await supabase.from("profiles").select("full_name, email").eq("id", auth.claims.sub).single();
  return data?.full_name || data?.email || "";
}

export type InviteResult = { ok: true; emailSent: boolean } | { ok: false; error: string };

/** Database error code (e.g. "plan_member_limit") for the caller's own error mapping. */
const failed = (message: string | undefined): InviteResult => ({ ok: false, error: message ?? "generic" });

/** Owner or admin invites a team member to a company account. */
export async function inviteTeamMember(input: {
  accountId: string;
  email: string;
  role: Enums<"account_role">;
  scope?: Enums<"property_scope">;
  propertyIds?: string[];
}): Promise<InviteResult> {
  const supabase = await createClient();
  const email = input.email.trim().toLowerCase();
  const scope = input.scope ?? "all";
  const { data: token, error } = await supabase.rpc("create_account_invitation", {
    p_account_id: input.accountId,
    p_email: email,
    p_role: input.role,
    p_scope: scope,
    p_property_ids: input.propertyIds ?? [],
  });
  if (error || !token) return failed(error?.message);

  const [{ data: account }, { data: invitation }, inviter, locale] = await Promise.all([
    supabase.from("accounts").select("name").eq("id", input.accountId).single(),
    supabase.from("invitations").select("expires_at").eq("kind", "account_member").eq("account_id", input.accountId).eq("email", email)
      .is("revoked_at", null).order("created_at", { ascending: false }).limit(1).single(),
    myDisplayName(),
    senderLocale(),
  ]);
  const emailSent = await sendEmail(
    email,
    teamMemberEmail({
      locale,
      url: await appUrl("portal", `/invite/${token}`),
      expiresAt: invitation?.expires_at ?? new Date().toISOString(),
      inviter,
      account: account?.name ?? "",
      role: input.role,
      propertyCount: scope === "selected" ? (input.propertyIds?.length ?? 0) : null,
      email,
    }),
    "invitation_member",
  );
  return { ok: true, emailSent };
}

/** The landlord side asks the tenant to approve a draft lease (this also confirms the landlord side). */
export async function inviteLeaseTenant(input: { leaseId: string; email: string }): Promise<InviteResult> {
  const supabase = await createClient();
  const email = input.email.trim().toLowerCase();
  const { data: token, error } = await supabase.rpc("create_lease_invitation", { p_lease_id: input.leaseId, p_email: email, p_kind: "lease_tenant" });
  if (error || !token) return failed(error?.message);

  const [{ data: lease }, { data: invitation }, locale] = await Promise.all([
    supabase.from("leases").select(`monthly_rent, start_date, end_date, accounts!leases_account_id_fkey(name), properties(${ADDRESS_COLUMNS})`)
      .eq("id", input.leaseId).single(),
    supabase.from("invitations").select("expires_at").eq("kind", "lease_tenant").eq("lease_id", input.leaseId).eq("email", email)
      .is("revoked_at", null).order("created_at", { ascending: false }).limit(1).single(),
    senderLocale(),
  ]);
  if (!lease?.properties) return { ok: true, emailSent: false };
  const street = streetLine(addressFromRow(lease.properties));
  const emailSent = await sendEmail(
    email,
    leaseTenantEmail({
      locale,
      url: await appUrl("portal", `/invite/${token}`),
      expiresAt: invitation?.expires_at ?? new Date().toISOString(),
      landlord: lease.accounts?.name ?? "",
      lease: { address: street, monthlyRent: lease.monthly_rent, startDate: lease.start_date, endDate: lease.end_date },
      streetAddress: street,
    }),
    "invitation_tenant",
  );
  return { ok: true, emailSent };
}

/** The tenant side invites a co-tenant or an occupant to the home. */
export async function inviteOccupant(input: { leaseId: string; email: string; role: Enums<"occupant_role"> }): Promise<InviteResult> {
  const supabase = await createClient();
  const email = input.email.trim().toLowerCase();
  const { data: token, error } = await supabase.rpc("create_lease_invitation", {
    p_lease_id: input.leaseId,
    p_email: email,
    p_kind: "lease_occupant",
    p_occupant_role: input.role,
  });
  if (error || !token) return failed(error?.message);

  const [{ data: lease }, { data: invitation }, inviter, locale] = await Promise.all([
    supabase.from("leases").select(`properties(${ADDRESS_COLUMNS})`).eq("id", input.leaseId).single(),
    supabase.from("invitations").select("expires_at").eq("kind", "lease_occupant").eq("lease_id", input.leaseId).eq("email", email)
      .is("revoked_at", null).order("created_at", { ascending: false }).limit(1).single(),
    myDisplayName(),
    senderLocale(),
  ]);
  if (!lease?.properties) return { ok: true, emailSent: false };
  const emailSent = await sendEmail(
    email,
    occupantEmail({
      locale,
      url: await appUrl("portal", `/invite/${token}`),
      expiresAt: invitation?.expires_at ?? new Date().toISOString(),
      inviter,
      role: input.role,
      address: streetLine(addressFromRow(lease.properties)),
    }),
    "invitation_occupant",
  );
  return { ok: true, emailSent };
}

/** A super admin invites a colleague (@keyfly.app) to the admin. */
export async function inviteStaff(input: { email: string; role: Enums<"staff_role"> }): Promise<InviteResult> {
  const supabase = await createClient();
  const email = input.email.trim().toLowerCase();
  const { data: token, error } = await supabase.rpc("create_staff_invitation", { p_email: email, p_role: input.role });
  if (error || !token) return failed(error?.message);
  const [inviter, locale] = await Promise.all([myDisplayName(), senderLocale()]);
  const emailSent = await sendEmail(
    email,
    staffEmail({ locale, url: await appUrl("admin", `/invite/${token}`), validHours: STAFF_INVITATION_VALID_HOURS, inviter, role: input.role }),
    "invitation_staff",
  );
  return { ok: true, emailSent };
}
