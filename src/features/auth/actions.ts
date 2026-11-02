"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { SIGN_UP_OPEN } from "@/config/auth";
import { CONSENT_VERSIONS } from "@/config/consent";
import { isLocale } from "@/i18n/config";
import { requestOrigin } from "@/lib/request-origin";
import { clearResetPass, hasResetPass } from "@/lib/reset-pass";
import { safeNext } from "@/lib/safe-next";
import { isHuman } from "@/lib/turnstile";
import { hrefFor, type AppSite } from "@/lib/sites";
import type { Enums } from "@/lib/supabase/database.types";
import { forgetTrustedDevices } from "@/features/security/trusted";
import { hasAcceptedTerms, isFreshGoogleAccount, removeUnfinishedAccount } from "./google";
import { createAuthClient, createClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE } from "@/lib/supabase/session-cookies";
import { syncEmailLocale } from "./locale-sync";
import { isValidPassword } from "./password";
import { PENDING_EMAIL_COOKIE, pendingEmail } from "./pending-email";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type FormError = "email" | "password" | "name" | "terms" | "credentials" | "unconfirmed" | "noAccount" | "samePassword" | "rateLimit" | "captcha" | "resetExpired" | "generic";
export type FormState = { status: "idle" } | { status: "sent" } | { status: "error"; error: FormError; email?: string };

const site = (form: FormData): AppSite => (form.get("site") === "admin" ? "admin" : "portal");
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const emailOf = (form: FormData) => text(form, "email").toLowerCase();

/** Where links in auth emails land: the surface's /auth/confirm, then on to `next`. */
async function emailLinkTarget(target: AppSite, next: string) {
  const { origin, host } = await requestOrigin();
  return `${origin}${hrefFor(target, "/auth/confirm", host)}?next=${encodeURIComponent(safeNext(next))}`;
}

async function goTo(target: AppSite, path: string): Promise<never> {
  const { host } = await requestOrigin();
  redirect(hrefFor(target, path, host));
}

function authError(code: string | undefined): FormError {
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "rateLimit";
  return "generic";
}

/** Email + password sign-in (customer app). */
export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = emailOf(form);
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";
  if (!EMAIL_RE.test(email)) return { status: "error", error: "email", email };
  if (!password) return { status: "error", error: "password", email };
  if (!(await isHuman(form))) return { status: "error", error: "captcha", email };

  (await cookies()).set(REMEMBER_COOKIE, remember ? "1" : "0", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });
  const supabase = await createAuthClient({ remember });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return { status: "error", error: "credentials", email };
    if (error.code === "email_not_confirmed") return { status: "error", error: "unconfirmed", email };
    console.error("sign-in failed", error.code);
    return { status: "error", error: authError(error.code), email };
  }
  await syncEmailLocale(supabase, data.user.user_metadata);
  return goTo("portal", safeNext(form.get("next")));
}

/**
 * "Folytatás Google-fiókkal" / "Regisztráció Google-fiókkal" (canvas v2.4): off to Google, back through /auth/callback.
 * Google always lets the person choose the account. An unknown account becomes a new Keyfly account only after the
 * terms are accepted on /register/google.
 */
export async function continueWithGoogle(form: FormData) {
  const { origin, host } = await requestOrigin();
  const next = safeNext(form.get("next"));
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}${hrefFor("portal", "/auth/callback", host)}?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    console.error("google sign-in failed", error?.code);
    return goTo("portal", "/login?error=google");
  }
  redirect(data.url);
}

/** The terms on /register/google, after the first sign-in with Google: records the consents and the name. */
export async function finishGoogleSignUp(_prev: FormState, form: FormData): Promise<FormState> {
  const name = text(form, "fullName").replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 200) return { status: "error", error: "name" };
  if (form.get("terms") !== "on") return { status: "error", error: "terms" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { status: "error", error: "generic" };
  const id = String(auth.claims.sub);
  const locale = await getLocale();
  const [{ error: consentError }, { error: profileError }] = await Promise.all([
    supabase.from("consents").insert([
      { user_id: id, kind: "terms", version: CONSENT_VERSIONS.accountTerms },
      { user_id: id, kind: "privacy", version: CONSENT_VERSIONS.accountPrivacy },
    ]),
    supabase.from("profiles").update({ full_name: name, locale: isLocale(locale) ? locale : "hu" }).eq("id", id),
  ]);
  if (consentError || profileError) {
    console.error("google sign-up failed", consentError?.code ?? profileError?.code);
    return { status: "error", error: "generic" };
  }
  revalidatePath("/", "layout");
  return goTo("portal", safeNext(form.get("next")));
}

/** "Másik fiókot választok": the half-made account (no terms accepted yet) is removed, then Google again. */
export async function cancelGoogleSignUp(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && isFreshGoogleAccount(user) && !(await hasAcceptedTerms(supabase, user.id))) await removeUnfinishedAccount(user.id);
  await supabase.auth.signOut({ scope: "local" });
  return continueWithGoogle(form);
}

/** Sign-up with name, email, password and the accepted terms. The account works once the email is confirmed. */
export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  if (!SIGN_UP_OPEN) return { status: "error", error: "generic" };
  const name = text(form, "fullName").replace(/\s+/g, " ");
  const email = emailOf(form);
  const password = String(form.get("password") ?? "");
  if (name.length < 2 || name.length > 200) return { status: "error", error: "name", email };
  if (!EMAIL_RE.test(email) || email.length > 254) return { status: "error", error: "email", email };
  if (!isValidPassword(password)) return { status: "error", error: "password", email };
  if (form.get("terms") !== "on") return { status: "error", error: "terms", email };
  if (!(await isHuman(form))) return { status: "error", error: "captcha", email };

  const locale = await getLocale();
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await emailLinkTarget("portal", String(form.get("next") ?? "/")),
      data: {
        full_name: name,
        locale: isLocale(locale) ? locale : "hu",
        consents: { terms: CONSENT_VERSIONS.accountTerms, privacy: CONSENT_VERSIONS.accountPrivacy },
      },
    },
  });
  // An address that is already registered gets no error here (Supabase hides it): the owner receives an email instead.
  if (error) {
    if (error.code === "weak_password") return { status: "error", error: "password", email };
    console.error("sign-up failed", error.code);
    return { status: "error", error: authError(error.code), email };
  }
  await rememberPendingEmail(email);
  return goTo("portal", "/verify-email");
}

async function rememberPendingEmail(email: string) {
  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });
}

/** Sends the sign-up confirmation email again. */
export async function resendConfirmation(): Promise<FormState> {
  const email = await pendingEmail();
  if (!email) return { status: "error", error: "email" };
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: await emailLinkTarget("portal", "/") } });
  if (error) {
    console.error("resend failed", error.code);
    return { status: "error", error: authError(error.code) };
  }
  return { status: "sent" };
}

/** Emails a password-reset link. Always answers the same way, so it does not reveal who has an account. */
export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = emailOf(form);
  if (!EMAIL_RE.test(email)) return { status: "error", error: "email", email };
  if (!(await isHuman(form))) return { status: "error", error: "captcha", email };
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: await emailLinkTarget(site(form), "/reset-password") });
  if (error && authError(error.code) === "rateLimit") return { status: "error", error: "rateLimit", email };
  if (error) console.error("password reset failed", error.code);
  return { status: "sent" };
}

/** Sets a new password (after a reset link, which signs the user in). */
export async function updatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (!isValidPassword(password)) return { status: "error", error: "password" };
  // Only right after a verified reset link; elsewhere the password changes with the current one (Settings).
  if (!(await hasResetPass())) return { status: "error", error: "resetExpired" };
  const { error } = await (await createAuthClient()).auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { status: "error", error: "samePassword" };
    if (error.code === "weak_password") return { status: "error", error: "password" };
    console.error("password update failed", error.code);
    return { status: "error", error: "generic" };
  }
  await clearResetPass();
  await forgetTrustedDevices(await createClient());
  return goTo(site(form), "/");
}

export async function signOut(form: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const next = safeNext(form.get("next"));
  return goTo(site(form), next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
}

const START_VIEWS: Enums<"start_view">[] = ["tenant", "landlord", "manager"];

export type ViewState = { status: "idle" } | { status: "saved"; view: Enums<"start_view"> } | { status: "error" };

/**
 * Header "Nézet" menu: what the account's Overview shows. A company keeps each member's View (`account`); the personal
 * account keeps it on the profile. Stays on the page; the toast confirms.
 */
export async function switchView(_prev: ViewState, form: FormData): Promise<ViewState> {
  const view = String(form.get("view") ?? "") as Enums<"start_view">;
  if (view !== "tenant" && view !== "landlord") return { status: "error" };
  const account = String(form.get("account") ?? "");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { status: "error" };
  const { error } = account
    ? await supabase.rpc("set_account_view", { p_account_id: account, p_view: view })
    : await supabase.from("profiles").update({ start_view: view }).eq("id", data.claims.sub);
  if (error) return { status: "error" };
  revalidatePath("/", "layout");
  return { status: "saved", view };
}

/**
 * "How will you use Keyfly?" – picks the view. A property management company works in a company account:
 * that answer sets the landlord view and goes on to "Add a company".
 */
export async function setStartView(form: FormData) {
  const view = String(form.get("view") ?? "") as Enums<"start_view">;
  if (START_VIEWS.includes(view)) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) await supabase.from("profiles").update({ start_view: view === "manager" ? "landlord" : view }).eq("id", data.claims.sub);
  }
  return goTo("portal", view === "manager" ? "/companies/new" : "/");
}
