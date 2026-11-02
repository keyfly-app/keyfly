"use server";

import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/request-origin";
import { hrefFor } from "@/lib/sites";
import { createClient } from "@/lib/supabase/server";

export type InvitationError = "closed" | "forAnotherEmail" | "notAllowedForAccount" | "generic";
export type InvitationState = { status: "idle" } | { status: "declined" } | { status: "error"; error: InvitationError };

/** Maps the database's error messages (see the invitations migration) to what the page shows. */
function invitationError(message: string | undefined): InvitationError {
  switch (message) {
    case "invitation_not_found":
    case "invitation_closed":
    case "lease_not_pending":
      return "closed";
    case "invitation_for_another_email":
      return "forAnotherEmail";
    case "not_allowed_for_this_account":
      return "notAllowedForAccount";
    default:
      return "generic";
  }
}

/** Accept or decline (which button was pressed: `intent`). Lease invitations may name the renting account. */
export async function answerInvitation(_prev: InvitationState, form: FormData): Promise<InvitationState> {
  const token = String(form.get("token") ?? "");
  const supabase = await createClient();

  if (form.get("intent") === "decline") {
    const { error } = await supabase.rpc("decline_invitation", { p_token: token });
    if (error) return { status: "error", error: invitationError(error.message) };
    return { status: "declined" };
  }

  const tenantAccount = String(form.get("tenantAccount") ?? "");
  const { data: preview } = await supabase.rpc("invitation_preview", { p_token: token });
  const { error } = await supabase.rpc("accept_invitation", { p_token: token, ...(tenantAccount ? { p_tenant_account_id: tenantAccount } : {}) });
  if (error) {
    if (invitationError(error.message) === "generic") console.error("accept invitation failed", error.code);
    return { status: "error", error: invitationError(error.message) };
  }
  const { host } = await requestOrigin();
  // A team invitation lands in the company it is for (the membership just created); everything else on Overview.
  if (preview?.[0]?.kind === "account_member") {
    const { data: auth } = await supabase.auth.getClaims();
    const { data: joined } = await supabase
      .from("account_members")
      .select("accounts!inner(slug, kind)")
      .eq("user_id", String(auth?.claims.sub ?? ""))
      .eq("accounts.kind", "company")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (joined?.accounts.slug) redirect(hrefFor("portal", `/c/${joined.accounts.slug}`, host));
  }
  redirect(hrefFor("portal", "/", host));
}

/** Staff invitation (admin surface). Staff rights then need two-factor sign-in. */
export async function acceptStaffInvitation(_prev: InvitationState, form: FormData): Promise<InvitationState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_staff_invitation", { p_token: String(form.get("token") ?? "") });
  if (error) {
    if (invitationError(error.message) === "generic") console.error("accept staff invitation failed", error.code);
    return { status: "error", error: invitationError(error.message) };
  }
  const { host } = await requestOrigin();
  redirect(hrefFor("admin", "/", host));
}
