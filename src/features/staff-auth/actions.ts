"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { CONSENT_VERSIONS } from "@/config/consent";
import { syncEmailLocale } from "@/features/auth/locale-sync";
import { isValidPassword } from "@/features/auth/password";
import { isLocale } from "@/i18n/config";
import { requestOrigin } from "@/lib/request-origin";
import { safeNext } from "@/lib/safe-next";
import { hrefFor } from "@/lib/sites";
import { createClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE } from "@/lib/supabase/session-cookies";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CODE_RE = /^\d{6}$/;

export type StaffFormError = "email" | "password" | "name" | "terms" | "credentials" | "unconfirmed" | "code" | "codeFormat" | "rateLimit" | "generic";
export type StaffFormState = { status: "idle" } | { status: "sent"; email: string } | { status: "error"; error: StaffFormError; email?: string };
export type ResetState = { status: "idle" } | { status: "done" } | { status: "error" };

async function goToAdmin(path: string): Promise<never> {
  const { host } = await requestOrigin();
  redirect(hrefFor("admin", path, host));
}

/** Admin sessions end when the browser closes (also the one a confirmation link starts). */
async function forgetSessionOnClose() {
  (await cookies()).set(REMEMBER_COOKIE, "0", { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

function rateLimited(code: string | undefined) {
  return code === "over_email_send_rate_limit" || code === "over_request_rate_limit";
}

/**
 * Admin sign-in, step 1: email + password. Admin sessions are never kept after the browser closes.
 * Step 2 (the authenticator code, or setting it up the first time) is the /mfa page.
 */
export async function adminSignIn(_prev: StaffFormState, form: FormData): Promise<StaffFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { status: "error", error: "email", email };
  if (!password) return { status: "error", error: "password", email };

  await forgetSessionOnClose();
  const supabase = await createClient({ remember: false });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return { status: "error", error: "credentials", email };
    if (error.code === "email_not_confirmed") return { status: "error", error: "unconfirmed", email };
    if (rateLimited(error.code)) return { status: "error", error: "rateLimit", email };
    console.error("admin sign-in failed", error.code);
    return { status: "error", error: "generic", email };
  }
  const next = safeNext(form.get("next"));
  return goToAdmin(next === "/" ? "/mfa" : `/mfa?next=${encodeURIComponent(next)}`);
}

/**
 * Staff account from an invitation: the address comes from the invitation itself, never from the form.
 * The confirmation link brings them back to the invitation, signed in, to join.
 */
export async function staffSignUp(_prev: StaffFormState, form: FormData): Promise<StaffFormState> {
  const token = String(form.get("token") ?? "");
  const name = String(form.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const password = String(form.get("password") ?? "");
  if (name.length < 2 || name.length > 200) return { status: "error", error: "name" };
  if (!isValidPassword(password)) return { status: "error", error: "password" };
  if (form.get("terms") !== "on") return { status: "error", error: "terms" };

  const supabase = await createClient({ remember: false });
  const { data: invitation } = await supabase.rpc("staff_invitation_preview", { p_token: token }).maybeSingle();
  if (!invitation?.is_open) return { status: "error", error: "generic" };

  await forgetSessionOnClose();
  const locale = await getLocale();
  const { origin, host } = await requestOrigin();
  const invitePath = `/invite/${encodeURIComponent(token)}`;
  const { error } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: {
      emailRedirectTo: `${origin}${hrefFor("admin", "/auth/confirm", host)}?next=${encodeURIComponent(invitePath)}`,
      data: {
        full_name: name,
        locale: isLocale(locale) ? locale : "hu",
        consents: { terms: CONSENT_VERSIONS.accountTerms, privacy: CONSENT_VERSIONS.accountPrivacy },
      },
    },
  });
  if (error) {
    if (error.code === "weak_password") return { status: "error", error: "password" };
    if (rateLimited(error.code)) return { status: "error", error: "rateLimit" };
    console.error("staff sign-up failed", error.code);
    return { status: "error", error: "generic" };
  }
  return { status: "sent", email: invitation.email };
}

/** Admin sign-in, step 2: the 6-digit code (first time: the code that switches the new authenticator on). */
export async function verifyTotp(_prev: StaffFormState, form: FormData): Promise<StaffFormState> {
  const factorId = String(form.get("factorId") ?? "");
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!CODE_RE.test(code)) return { status: "error", error: "codeFormat" };

  const supabase = await createClient({ remember: false });
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    if (error.code === "mfa_verification_failed" || error.code === "mfa_challenge_expired") return { status: "error", error: "code" };
    if (rateLimited(error.code) || error.code === "mfa_verification_rejected") return { status: "error", error: "rateLimit" };
    console.error("mfa verify failed", error.code);
    return { status: "error", error: "generic" };
  }
  const { data } = await supabase.auth.getUser();
  await syncEmailLocale(supabase, data.user?.user_metadata);
  return goToAdmin(safeNext(form.get("next")));
}

/** Super admin: removes a colleague's authenticator (lost phone) and signs them out everywhere. */
export async function resetStaffMfa(_prev: ResetState, form: FormData): Promise<ResetState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_staff_mfa", { p_user_id: String(form.get("userId") ?? "") });
  if (error) {
    console.error("staff 2FA reset failed", error.code);
    return { status: "error" };
  }
  return { status: "done" };
}
