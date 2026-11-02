"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accessApprovedEmail, accessDeclinedEmail, accessRequestEmail, holderChangedEmail } from "@/features/invitations/emails";
import { appUrl, inviteTeamMember, myDisplayName, sendEmail } from "@/features/invitations/send";
import { isLocale } from "@/i18n/config";
import { requestOrigin } from "@/lib/request-origin";
import { hrefFor } from "@/lib/sites";
import type { Enums } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { queryTaxpayer, taxId, type Taxpayer } from "@/lib/szamlazz";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLES: Enums<"account_role">[] = ["admin", "manager", "viewer"];

// ---------- Add a company --------------------------------------------------------------

/** Result of the tax number lookup (canvas "Adószám-keresés – állapotok"). */
export type LookupState =
  | { status: "idle" }
  | { status: "format" | "invalid" | "unavailable" }
  | { status: "found"; tax8: string; taxpayer: Taxpayer; suggestedName: string }
  | { status: "exists"; accountId: string; name: string; taxNumber: string }
  | { status: "member"; name: string; slug: string }
  | { status: "requested"; name: string; requestedAt: string }
  | { status: "inviteOnly"; name: string };

export async function lookupCompany(_: LookupState, form: FormData): Promise<LookupState> {
  const tax8 = taxId(String(form.get("tax") ?? ""));
  if (!tax8) return { status: "format" };
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("company_lookup", { p_tax8: tax8 });
  const found = rows?.[0];
  if (found) {
    if (found.i_am_member && found.slug) return { status: "member", name: found.name, slug: found.slug };
    if (found.invitation_only) return { status: "inviteOnly", name: found.name };
    if (found.requested_at) return { status: "requested", name: found.name, requestedAt: found.requested_at };
    return { status: "exists", accountId: found.account_id, name: found.name, taxNumber: String(form.get("tax") ?? "").trim() };
  }
  const nav = await queryTaxpayer(tax8);
  if (nav.status !== "found") return { status: nav.status };
  return { status: "found", tax8, taxpayer: nav.taxpayer, suggestedName: nav.taxpayer.shortName ?? nav.taxpayer.legalName };
}

export type CreateState = { status: "idle" } | { status: "error"; error: "declaration" | "name" | "exists" | "setup" | "invalid" | "unavailable" | "generic" };

/** Creates the company with NAV data fetched again here (never from the browser), then switches to it. */
export async function createCompany(_: CreateState, form: FormData): Promise<CreateState> {
  if (form.get("declaration") !== "on") return { status: "error", error: "declaration" };
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 200) return { status: "error", error: "name" };
  const tax8 = taxId(String(form.get("tax") ?? ""));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!tax8 || !auth?.claims) return { status: "error", error: "generic" };

  const admin = createAdminClient();
  if (!admin) {
    console.error("company creation needs SUPABASE_SECRET_KEY");
    return { status: "error", error: "setup" };
  }
  const nav = await queryTaxpayer(tax8);
  if (nav.status !== "found") return { status: "error", error: nav.status };
  // Accounts keep the full tax number (12345678-2-41); NAV always sends it for a valid taxpayer.
  if (!/^\d{8}-\d-\d{2}$/.test(nav.taxpayer.taxNumber)) return { status: "error", error: "invalid" };
  const { data: id, error } = await admin.rpc("create_company_account", {
    p_owner: String(auth.claims.sub),
    p_legal_name: nav.taxpayer.legalName,
    p_tax_number: nav.taxpayer.taxNumber,
    p_registered_address: nav.taxpayer.address ?? undefined,
    p_name: name,
  });
  if (error || !id) {
    if (error?.message === "company_exists") return { status: "error", error: "exists" };
    console.error("create company failed", error?.code);
    return { status: "error", error: "generic" };
  }
  const { data: created } = await supabase.from("accounts").select("slug").eq("id", id).single();
  revalidatePath("/", "layout");
  const { host } = await requestOrigin();
  redirect(hrefFor("portal", `/c/${created?.slug ?? ""}?created=1`, host));
}

export type AccessState = { status: "idle" } | { status: "sent" } | { status: "error"; error: "alreadyRequested" | "inviteOnly" | "alreadyMember" | "message" | "generic" };

/** Asks to join an existing company. The owner and admins are emailed (needs the server's secret key to find them). */
export async function requestAccess(_: AccessState, form: FormData): Promise<AccessState> {
  const accountId = String(form.get("accountId") ?? "");
  const message = String(form.get("message") ?? "").trim();
  if (message.length > 500) return { status: "error", error: "message" };
  const supabase = await createClient();
  const { data: requestId, error } = await supabase.rpc("request_company_access", { p_account_id: accountId, p_message: message || undefined });
  if (error || !requestId) {
    const known = { already_requested: "alreadyRequested", invitation_only: "inviteOnly", already_member: "alreadyMember" } as const;
    return { status: "error", error: known[error?.message as keyof typeof known] ?? "generic" };
  }
  await notifyApprovers(accountId, message || null);
  return { status: "sent" };
}

async function notifyApprovers(accountId: string, message: string | null) {
  const admin = createAdminClient();
  if (!admin) return; // the request still shows on the Team page
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const [{ data: account }, { data: approvers }, name] = await Promise.all([
    admin.from("accounts").select("name, slug").eq("id", accountId).single(),
    admin.from("account_members").select("profiles!account_members_user_id_fkey!inner(email, locale)").eq("account_id", accountId).in("role", ["owner", "admin"]),
    myDisplayName(),
  ]);
  if (!account) return;
  const url = await appUrl("portal", `/c/${account.slug}/settings/team`);
  const email = String(auth?.claims.email ?? "");
  await Promise.all(
    (approvers ?? []).map((a) =>
      a.profiles.email
        ? sendEmail(
            a.profiles.email,
            accessRequestEmail({ locale: isLocale(a.profiles.locale) ? a.profiles.locale : "hu", url, account: account.name, name: name || email, email, message }),
            "company_access_request",
          )
        : Promise.resolve(false),
    ),
  );
}

// ---------- Team -----------------------------------------------------------------------

export type TeamState = { status: "idle" } | { status: "done"; message: string; value?: string } | { status: "error"; error: "email" | "alreadyMember" | "notAllowed" | "closed" | "generic" };

const teamError = (message: string | undefined): TeamState => {
  if (message === "already_member") return { status: "error", error: "alreadyMember" };
  if (message === "not_allowed") return { status: "error", error: "notAllowed" };
  if (message === "request_closed") return { status: "error", error: "closed" };
  if (message === "own_role" || message === "holder_role_fixed" || message === "new_owner_must_be_a_member") return { status: "error", error: "notAllowed" };
  return { status: "error", error: "generic" };
};

export async function decideRequest(_: TeamState, form: FormData): Promise<TeamState> {
  const approve = form.get("decision") === "approve";
  const role = String(form.get("role") ?? "manager") as Enums<"account_role">;
  if (approve && !ROLES.includes(role)) return { status: "error", error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_access_request", { p_request_id: String(form.get("requestId") ?? ""), p_approve: approve, p_role: role });
  const r = data?.[0];
  if (error || !r) return teamError(error?.message);
  const locale = isLocale(r.requester_locale) ? r.requester_locale : "hu";
  await sendEmail(
    r.requester_email,
    approve
      ? accessApprovedEmail({ locale, url: await appUrl("portal", `/c/${r.account_slug}`), account: r.account_name, role })
      : accessDeclinedEmail({ locale, account: r.account_name }),
    approve ? "company_access_approved" : "company_access_declined",
  );
  revalidatePath("/", "layout");
  return { status: "done", message: approve ? "approved" : "declined", value: r.requester_name ?? r.requester_email };
}

export async function inviteMember(_: TeamState, form: FormData): Promise<TeamState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "manager") as Enums<"account_role">;
  if (!EMAIL_RE.test(email) || email.length > 254) return { status: "error", error: "email" };
  if (!ROLES.includes(role)) return { status: "error", error: "generic" };
  const result = await inviteTeamMember({ accountId: String(form.get("accountId") ?? ""), email, role });
  if (!result.ok) return teamError(result.error);
  revalidatePath("/", "layout");
  return { status: "done", message: result.emailSent ? "invited" : "invitedNoEmail", value: email };
}

/** Pending invitation: send again (a new link, the old one stops) or withdraw. */
export async function manageInvitation(_: TeamState, form: FormData): Promise<TeamState> {
  const supabase = await createClient();
  const id = String(form.get("invitationId") ?? "");
  if (form.get("intent") === "withdraw") {
    const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: id });
    if (error) return teamError(error.message);
    revalidatePath("/", "layout");
    return { status: "done", message: "withdrawn" };
  }
  const { data: inv } = await supabase.from("invitations").select("account_id, email, account_role").eq("id", id).single();
  if (!inv?.account_id || !inv.account_role) return { status: "error", error: "generic" };
  const result = await inviteTeamMember({ accountId: inv.account_id, email: inv.email, role: inv.account_role });
  if (!result.ok) return teamError(result.error);
  revalidatePath("/", "layout");
  return { status: "done", message: "resent", value: inv.email };
}

export async function removeMember(_: TeamState, form: FormData): Promise<TeamState> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("account_members")
    .delete({ count: "exact" })
    .eq("account_id", String(form.get("accountId") ?? ""))
    .eq("user_id", String(form.get("userId") ?? ""));
  if (error || !count) return { status: "error", error: "notAllowed" };
  revalidatePath("/", "layout");
  return { status: "done", message: "removed" };
}

/** Change a member's role in their row (canvas "Csapat – szerepkör választása a sorban"). Saved at once. */
export async function setMemberRole(input: { accountId: string; userId: string; role: Enums<"account_role"> }): Promise<TeamState> {
  if (!ROLES.includes(input.role)) return { status: "error", error: "generic" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", { p_account_id: input.accountId, p_user_id: input.userId, p_role: input.role });
  if (error) return teamError(error.message);
  revalidatePath("/", "layout");
  return { status: "done", message: "roleChanged" };
}

/** Hand the account over to another member; the previous account holder becomes an admin. Both get an email. */
export async function transferHolder(_: TeamState, form: FormData): Promise<TeamState> {
  const accountId = String(form.get("accountId") ?? "");
  const to = String(form.get("userId") ?? "");
  if (!to) return { status: "error", error: "generic" };
  const supabase = await createClient();
  const [{ data: before }, { data: account }] = await Promise.all([
    supabase.rpc("account_members_list", { p_account_id: accountId }),
    supabase.from("accounts").select("name, slug").eq("id", accountId).single(),
  ]);
  const { error } = await supabase.rpc("transfer_account_ownership", { p_account_id: accountId, p_new_owner: to });
  if (error) return teamError(error.message);
  const prev = before?.find((m) => m.role === "owner");
  const next = before?.find((m) => m.user_id === to);
  if (account && prev && next) {
    const admin = createAdminClient();
    const { data: locales } = admin ? await admin.from("profiles").select("id, locale").in("id", [prev.user_id, next.user_id]) : { data: null };
    const loc = (id: string) => {
      const l = locales?.find((p) => p.id === id)?.locale;
      return isLocale(l) ? l : "hu";
    };
    const url = await appUrl("portal", `/c/${account.slug}/settings/team`);
    await Promise.all([
      sendEmail(next.email, holderChangedEmail({ locale: loc(next.user_id), url, account: account.name, other: prev.full_name ?? prev.email, side: "new" }), "company_holder_new"),
      sendEmail(prev.email, holderChangedEmail({ locale: loc(prev.user_id), url, account: account.name, other: next.full_name ?? next.email, side: "previous" }), "company_holder_previous"),
    ]);
  }
  revalidatePath("/", "layout");
  return { status: "done", message: "transferred", value: next?.full_name ?? next?.email ?? "" };
}

/** Leave a company account yourself (not the owner: ownership is handed over first). Then back to your own account. */
export async function leaveCompany(_: TeamState, form: FormData): Promise<TeamState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { status: "error", error: "generic" };
  const { error, count } = await supabase
    .from("account_members")
    .delete({ count: "exact" })
    .eq("account_id", String(form.get("accountId") ?? ""))
    .eq("user_id", String(auth.claims.sub))
    .neq("role", "owner");
  if (error || !count) return { status: "error", error: "notAllowed" };
  revalidatePath("/", "layout");
  const { host } = await requestOrigin();
  redirect(hrefFor("portal", "/", host));
}

// ---------- Company details --------------------------------------------------------------

export type Office = { postal_code: string; city: string; street: string };
export type DetailsField = "name" | "legalName" | "taxEnd" | "euVat" | "regNumber" | "officePostal" | "officeCity" | "officeStreet" | "mailPostal" | "mailCity" | "mailStreet" | "email" | "phone";
export type DetailsState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; error: "notAllowed" | "generic" }
  | { status: "invalid"; fields: Partial<Record<DetailsField, "required" | "format">> };

const clean = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Saves the company details (canvas "Cégadatok – szerkeszthető"). The first eight digits of the tax number never change. */
export async function updateCompanyDetails(_: DetailsState, form: FormData): Promise<DetailsState> {
  const accountId = String(form.get("accountId") ?? "");
  const fields: Partial<Record<DetailsField, "required" | "format">> = {};
  const need = (key: DetailsField, value: string, max: number) => {
    if (!value) fields[key] = "required";
    else if (value.length > max) fields[key] = "format";
    return value;
  };
  const name = need("name", clean(form.get("name")), 200);
  const legalName = need("legalName", clean(form.get("legalName")), 300);
  const taxEndRaw = clean(form.get("taxEnd")).replace(/\s/g, "");
  const taxEnd = /^\d-?\d{2}$/.test(taxEndRaw) ? `${taxEndRaw[0]}-${taxEndRaw.slice(-2)}` : null;
  if (!taxEnd) fields.taxEnd = taxEndRaw ? "format" : "required";
  const euVat = clean(form.get("euVat")).replace(/\s/g, "").toUpperCase();
  if (euVat && !/^HU\d{8}$/.test(euVat)) fields.euVat = "format";
  const regNumber = clean(form.get("regNumber")).replace(/\s/g, "");
  if (regNumber && !/^\d{2}-\d{2}-\d{6}$/.test(regNumber)) fields.regNumber = "format";
  const address = (prefix: "office" | "mail"): Office => {
    const postal_code = clean(form.get(`${prefix}Postal`));
    if (!postal_code) fields[`${prefix}Postal`] = "required";
    else if (!/^\d{4}$/.test(postal_code)) fields[`${prefix}Postal`] = "format";
    return { postal_code, city: need(`${prefix}City`, clean(form.get(`${prefix}City`)), 100), street: need(`${prefix}Street`, clean(form.get(`${prefix}Street`)), 200) };
  };
  const office = address("office");
  const mailing = form.get("sameAsOffice") === "on" ? null : address("mail");
  const email = clean(form.get("email"));
  if (email && (!EMAIL_RE.test(email) || email.length > 254)) fields.email = "format";
  const phone = clean(form.get("phone"));
  if (phone && !/^\+?[0-9 ()/-]{6,30}$/.test(phone)) fields.phone = "format";
  if (Object.keys(fields).length) return { status: "invalid", fields };

  const supabase = await createClient();
  const { data: current } = await supabase.from("accounts").select("tax_number").eq("id", accountId).maybeSingle();
  if (!current?.tax_number) return { status: "error", error: "notAllowed" };
  const { error, count } = await supabase
    .from("accounts")
    .update(
      {
        name,
        legal_name: legalName,
        tax_number: `${current.tax_number.slice(0, 8)}-${taxEnd}`,
        eu_vat_number: euVat || null,
        company_reg_number: regNumber || null,
        office_address: office,
        mailing_address: mailing,
        contact_email: email || null,
        contact_phone: phone || null,
      },
      { count: "exact" },
    )
    .eq("id", accountId);
  if (error) {
    console.error("company details failed", error.code);
    return { status: "error", error: "generic" };
  }
  if (!count) return { status: "error", error: "notAllowed" };
  revalidatePath("/", "layout");
  return { status: "saved" };
}

export type NavRefresh = { status: "found"; legalName: string; taxEnd: string | null; office: Office | null } | { status: "invalid" | "unavailable" | "notAllowed" };

/** "Frissítés a NAV-ból": NAV's current data for the form; nothing is saved until the person presses Save. */
export async function refreshFromNav(accountId: string): Promise<NavRefresh> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { status: "notAllowed" };
  const [{ data: account }, { data: me }] = await Promise.all([
    supabase.from("accounts").select("tax_number").eq("id", accountId).maybeSingle(),
    supabase.from("account_members").select("role").eq("account_id", accountId).eq("user_id", String(auth.claims.sub)).maybeSingle(),
  ]);
  const tax8 = account?.tax_number ? taxId(account.tax_number) : null;
  if (!tax8 || (me?.role !== "owner" && me?.role !== "admin")) return { status: "notAllowed" };
  const nav = await queryTaxpayer(tax8);
  if (nav.status !== "found") return { status: nav.status };
  const end = nav.taxpayer.taxNumber.length === 13 ? nav.taxpayer.taxNumber.slice(9) : null;
  return { status: "found", legalName: nav.taxpayer.legalName, taxEnd: end, office: nav.taxpayer.office };
}

/** Withdraw one's own pending access request (canvas "Cégeim"). */
export async function cancelAccessRequest(requestId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_access_request", { p_request_id: requestId });
  if (!error) revalidatePath("/", "layout");
  return { ok: !error };
}
