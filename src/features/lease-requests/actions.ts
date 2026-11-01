"use server";

import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { ADDRESS_COLUMNS, addressFromRow, streetLine, withDot } from "@/lib/address";
import { requestOrigin } from "@/lib/request-origin";
import { hrefFor } from "@/lib/sites";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { landlordEmail, leaseApprovedEmail, termsChangedEmail } from "@/features/invitations/emails";
import { appUrl, myDisplayName, sendEmail, senderLocale } from "@/features/invitations/send";
import { hasErrors, parseAmount, parseFloor, validateAddress, validateLandlord, validateTerms, type Errors, type Values } from "./validate";

export type GeneralError =
  | "tooMany"
  | "reminderTooSoon"
  | "reminderLimit"
  | "closed"
  | "overlaps"
  | "property"
  | "account"
  | "ownAccount"
  | "generic";
export type RequestState =
  | { status: "idle" }
  | { status: "reminded" }
  | { status: "error"; fields?: Errors; error?: GeneralError };
export type TakeOverState =
  | { status: "idle" }
  | { status: "done"; needsTenantApproval: boolean }
  | { status: "error"; fields?: Errors; error?: GeneralError };

const read = (form: FormData): Values => Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
const optional = (v: string | undefined) => (v ?? "").trim() || undefined;

/** Maps the database's error messages (see the lease_requests migration) to what the forms show. */
function dbError(message: string | undefined): { fields?: Errors; error?: GeneralError } {
  switch (message) {
    case "cannot_invite_yourself":
      return { fields: { landlordEmail: "self" } };
    case "lease_already_ended":
      return { fields: { endDate: "ended" } };
    case "too_many_open_requests":
      return { error: "tooMany" };
    case "reminder_too_soon":
      return { error: "reminderTooSoon" };
    case "reminder_limit":
      return { error: "reminderLimit" };
    case "lease_overlaps":
      return { error: "overlaps" };
    case "property_not_in_account":
      return { error: "property" };
    case "not_allowed_for_this_account":
      return { error: "account" };
    case "cannot_rent_to_yourself":
      return { error: "ownAccount" };
    case "request_closed":
    case "not_waiting_for_landlord":
    case "invitation_closed":
    case "invitation_not_found":
      return { error: "closed" };
    default:
      return { error: "generic" };
  }
}

async function goTo(path: string): Promise<never> {
  const { host } = await requestOrigin();
  redirect(hrefFor("portal", path, host));
}

/** Email to the landlord with the invitation link (first send and reminders). */
async function emailLandlord(requestId: string, token: string, expiresAt: string, reminder: boolean) {
  const supabase = await createClient();
  const { data: r } = await supabase.from("lease_requests").select(`landlord_email, monthly_rent, start_date, ${ADDRESS_COLUMNS}`).eq("id", requestId).single();
  if (!r) return;
  const [tenant, locale] = await Promise.all([myDisplayName(), senderLocale()]);
  await sendEmail(
    r.landlord_email,
    landlordEmail({
      locale,
      url: await appUrl("portal", `/invite/${token}`),
      expiresAt,
      tenant,
      lease: { address: streetLine(addressFromRow(r)), monthlyRent: r.monthly_rent, startDate: r.start_date },
      reminder,
    }),
    reminder ? "invitation_landlord_reminder" : "invitation_landlord",
  );
}

/** Steps 1–3: the tenant sends the request; the landlord gets the invitation email. */
export async function createLeaseRequest(_prev: RequestState, form: FormData): Promise<RequestState> {
  const v = read(form);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const fields = { ...validateAddress(v), ...validateTerms(v), ...validateLandlord(v, String(claims?.claims.email ?? "")) };
  if (hasErrors(fields)) return { status: "error", fields };

  const { floorType, floorNumber } = parseFloor(v.floor);
  const { data, error } = await supabase.rpc("create_lease_request", {
    p_postal_code: v.postalCode.trim(),
    p_city: v.city.trim(),
    p_street_name: v.streetName.trim(),
    p_street_type: v.streetType.trim(),
    p_house_number: withDot(v.houseNumber),
    p_building: optional(v.building),
    p_staircase: optional(v.staircase) && withDot(v.staircase),
    p_floor_type: (floorType ?? undefined) as Enums<"floor_type"> | undefined,
    p_floor_number: floorNumber ?? undefined,
    p_door: optional(v.door) && withDot(v.door),
    p_start_date: v.startDate,
    p_end_date: v.term === "open" ? undefined : v.endDate,
    p_monthly_rent: parseAmount(v.monthlyRent)!,
    p_deposit_amount: parseAmount(v.deposit) ?? undefined,
    p_landlord_email: v.landlordEmail.trim().toLowerCase(),
    p_landlord_name: optional(v.landlordName),
  });
  const created = data?.[0];
  if (error || !created) {
    if (dbError(error?.message).error === "generic") console.error("lease request failed", error?.code);
    return { status: "error", ...dbError(error?.message) };
  }
  await emailLandlord(created.request_id, created.token, created.expires_at, false);
  return goTo(`/lease-requests/${created.request_id}?sent=1`);
}

/** A new link to the landlord (the old one stops working). */
export async function remindLeaseRequest(_prev: RequestState, form: FormData): Promise<RequestState> {
  const requestId = String(form.get("requestId") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remind_lease_request", { p_request_id: requestId });
  const sent = data?.[0];
  if (error || !sent) return { status: "error", ...dbError(error?.message) };
  await emailLandlord(requestId, sent.token, sent.expires_at, true);
  return { status: "reminded" };
}

/** Withdraw the invitation, or turn down the landlord's changed terms. */
export async function cancelLeaseRequest(_prev: RequestState, form: FormData): Promise<RequestState> {
  const requestId = String(form.get("requestId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_lease_request", { p_request_id: requestId });
  if (error) return { status: "error", ...dbError(error.message) };
  return goTo(`/lease-requests/${requestId}`);
}

/** Accept the landlord's terms: the lease is confirmed. */
export async function confirmLeaseRequest(_prev: RequestState, form: FormData): Promise<RequestState> {
  const requestId = String(form.get("requestId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_lease_request", { p_request_id: requestId });
  if (error) return { status: "error", ...dbError(error.message) };
  return goTo(`/lease-requests/${requestId}`);
}

/** Steps 5–6: the landlord takes over the lease; the tenant is told the outcome. */
export async function takeOverLease(_prev: TakeOverState, form: FormData): Promise<TakeOverState> {
  const v = read(form);
  const fields = validateTerms(v);
  if (hasErrors(fields)) return { status: "error", fields };
  if (!v.accountId || (v.propertyMode === "existing" && !v.propertyId)) return { status: "error", error: "property" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_landlord_invitation", {
    p_token: v.token,
    p_account_id: v.accountId,
    p_property_id: v.propertyMode === "existing" ? v.propertyId : undefined,
    p_start_date: v.startDate,
    p_end_date: v.term === "open" ? undefined : v.endDate,
    p_monthly_rent: parseAmount(v.monthlyRent)!,
    p_deposit_amount: parseAmount(v.deposit) ?? undefined,
    p_payment_day: v.paymentDay ? Number(v.paymentDay) : undefined,
  });
  const result = data?.[0];
  if (error || !result) {
    if (dbError(error?.message).error === "generic") console.error("lease take-over failed", error?.code);
    return { status: "error", ...dbError(error?.message) };
  }

  if (result.tenant_email) {
    const [{ data: lease }, { data: account }] = await Promise.all([
      supabase.from("leases").select(`monthly_rent, start_date, end_date, properties(${ADDRESS_COLUMNS})`).eq("id", result.lease_id).single(),
      supabase.from("accounts").select("name").eq("id", v.accountId).single(),
    ]);
    if (lease?.properties) {
      const locale = isLocale(result.tenant_locale) ? result.tenant_locale : "hu";
      const street = streetLine(addressFromRow(lease.properties));
      const url = await appUrl("portal", `/lease-requests/${v.requestId}`);
      const landlord = account?.name ?? "";
      const email = result.needs_tenant_approval
        ? termsChangedEmail({ locale, url, landlord, streetAddress: street })
        : leaseApprovedEmail({
            locale,
            url,
            landlord,
            streetAddress: street,
            lease: { address: street, monthlyRent: lease.monthly_rent, startDate: lease.start_date, endDate: lease.end_date },
          });
      await sendEmail(result.tenant_email, email, result.needs_tenant_approval ? "lease_terms_changed" : "lease_approved");
    }
  }
  return { status: "done", needsTenantApproval: result.needs_tenant_approval };
}
