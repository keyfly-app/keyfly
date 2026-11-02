"use server";

import { createHash, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { securityEmail, signInCodeEmail } from "@/features/invitations/emails";
import { appUrl, sendEmail } from "@/features/invitations/send";
import { isLocale } from "@/i18n/config";
import { requestOrigin } from "@/lib/request-origin";
import { safeNext } from "@/lib/safe-next";
import { hrefFor } from "@/lib/sites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient, createClient } from "@/lib/supabase/server";
import { TRUSTED_COOKIE } from "@/lib/trusted-device";
import { currentTrustedId, forgetTrustedDevices, trustThisDevice } from "./trusted";

const CODE_RE = /^\d{6}$/;
/** Backup codes: 8 characters from an alphabet without look-alikes, shown as "xxxx-xxxx". */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");
const normalise = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, "");

function newCodes(): string[] {
  return Array.from({ length: 10 }, () => {
    const raw = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

async function saveCodes(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string[] | null> {
  const codes = newCodes();
  const { error } = await supabase.rpc("set_recovery_codes", { p_hashes: codes.map((c) => hashCode(normalise(c))) });
  if (error) {
    console.error("backup codes failed", error.code);
    return null;
  }
  return codes;
}

/** Security notices go to the signed-in person in their own language; they are always sent. */
async function notify(supabase: Awaited<ReturnType<typeof createClient>>, kind: "twoStepOn" | "twoStepOff" | "recoveryUsed") {
  const { data: auth } = await supabase.auth.getClaims();
  const email = typeof auth?.claims.email === "string" ? auth.claims.email : null;
  if (!email) return;
  const { data: profile } = await supabase.from("profiles").select("locale").eq("id", String(auth?.claims.sub)).maybeSingle();
  const locale = isLocale(profile?.locale) ? profile.locale : "hu";
  await sendEmail(email, securityEmail({ locale, url: await appUrl("portal", "/settings/security"), kind }), `security_${kind}`);
}

/** The authenticator's code, through the auth client (the visitor's IP counts for the MFA rate limit). */
async function verifyCode(factorId: string, code: string) {
  return (await createAuthClient()).auth.mfa.challengeAndVerify({ factorId, code });
}

type MfaError = "code" | "expired" | "rate" | "generic";
function mfaError(code: string | undefined): MfaError {
  if (code === "mfa_verification_failed" || code === "mfa_challenge_expired") return "code";
  if (code === "mfa_factor_not_found") return "expired";
  if (code === "over_request_rate_limit" || code === "mfa_verification_rejected") return "rate";
  return "generic";
}

// ---------- Turning it on ----------------------------------------------------------------

export type SetupState = { status: "error" } | { status: "ready"; factorId: string; qrCode: string; secret: string; uri: string };

/** Step 1: a new authenticator to scan. Runs on click, never while a page renders (a reload must not swap the QR code). */
export async function startTwoStep(): Promise<SetupState> {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.length) return { status: "error" }; // already on
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Keyfly" });
  if (error || !data) {
    console.error("two-step enroll failed", error?.code);
    return { status: "error" };
  }
  return { status: "ready", factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri };
}

export type ConfirmState = { status: "idle" } | { status: "error"; error: MfaError | "format" } | { status: "codes"; codes: string[] };

/** Step 1 → 2: the first code switches the authenticator on; then the backup codes are made (shown once). */
export async function confirmTwoStep(_: ConfirmState, form: FormData): Promise<ConfirmState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!CODE_RE.test(code)) return { status: "error", error: "format" };
  const { error } = await verifyCode(String(form.get("factorId") ?? ""), code);
  if (error) return { status: "error", error: mfaError(error.code) };
  // A new client: it reads the session the code just raised to the second factor.
  const supabase = await createClient();
  const codes = await saveCodes(supabase);
  if (!codes) return { status: "error", error: "generic" };
  await notify(supabase, "twoStepOn");
  revalidatePath("/", "layout");
  return { status: "codes", codes };
}

export type RenewState = { status: "idle" } | { status: "codes"; codes: string[] } | { status: "error"; error: MfaError | "format" };

/**
 * New backup codes (the old ones stop working). Needs the second factor: a session that skipped the code on a trusted
 * device sends a current code with the request.
 */
export async function renewBackupCodes(_: RenewState, form: FormData): Promise<RenewState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (code) {
    if (!CODE_RE.test(code)) return { status: "error", error: "format" };
    const { data: factors } = await (await createClient()).auth.mfa.listFactors();
    const factor = factors?.totp[0];
    if (!factor) return { status: "error", error: "generic" };
    const { error } = await verifyCode(factor.id, code);
    if (error) return { status: "error", error: mfaError(error.code) };
  }
  const codes = await saveCodes(await createClient());
  revalidatePath("/", "layout");
  return codes ? { status: "codes", codes } : { status: "error", error: "generic" };
}

export type OffState = { status: "idle" } | { status: "error"; error: MfaError | "format" };

/** Turning it off asks for a current code once more, then removes the authenticator and the backup codes. */
export async function turnOffTwoStep(_: OffState, form: FormData): Promise<OffState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!CODE_RE.test(code)) return { status: "error", error: "format" };
  const { data: factors } = await (await createClient()).auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (!factor) return { status: "error", error: "generic" };
  const { error } = await verifyCode(factor.id, code);
  if (error) return { status: "error", error: mfaError(error.code) };
  const supabase = await createClient();
  await supabase.rpc("delete_recovery_codes");
  await forgetTrustedDevices(supabase);
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  await supabase.auth.refreshSession();
  await notify(supabase, "twoStepOff");
  revalidatePath("/", "layout");
  return { status: "idle" };
}

// ---------- Signing in --------------------------------------------------------------------

export type ChallengeState = { status: "idle" } | { status: "error"; error: MfaError | "format" | "backup" | "locked" | "setup" };

/** Sign-in, step 2: the code from the authenticator app. */
export async function verifySignInCode(_: ChallengeState, form: FormData): Promise<ChallengeState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!CODE_RE.test(code)) return { status: "error", error: "format" };
  const { data: factors } = await (await createClient()).auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (!factor) return { status: "error", error: "generic" };
  const { error } = await verifyCode(factor.id, code);
  if (error) return { status: "error", error: mfaError(error.code) };
  if (form.get("remember") === "on") await trustThisDevice(await createClient());
  const { host } = await requestOrigin();
  redirect(hrefFor("portal", safeNext(form.get("next")), host));
}

/**
 * Sign-in with a backup code (no phone at hand). A used code cannot lift the session to the second factor, so the
 * authenticator is removed instead: the person is in, gets an email, and is asked to set two-step up again.
 */
export async function useBackupCode(_: ChallengeState, form: FormData): Promise<ChallengeState> {
  const code = normalise(String(form.get("backup") ?? ""));
  if (code.length !== 8) return { status: "error", error: "backup" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { status: "error", error: "generic" };
  const admin = createAdminClient();
  if (!admin) return { status: "error", error: "setup" };
  const { data: ok, error } = await supabase.rpc("consume_recovery_code", { p_hash: hashCode(code) });
  if (error) return { status: "error", error: error.message === "too_many_attempts" ? "locked" : "generic" };
  if (!ok) return { status: "error", error: "backup" };

  const userId = String(auth.claims.sub);
  const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId });
  for (const f of factors?.factors ?? []) await admin.auth.admin.mfa.deleteFactor({ userId, id: f.id });
  await admin.from("mfa_recovery_codes").delete().eq("user_id", userId);
  await admin.from("trusted_devices").delete().eq("user_id", userId);
  (await cookies()).delete(TRUSTED_COOKIE);
  await supabase.auth.refreshSession();
  await notify(supabase, "recoveryUsed");
  const { host } = await requestOrigin();
  redirect(hrefFor("portal", "/settings/security?recovered=1", host));
}

// ---------- Sign-in code by email (canvas v2.4 "Kétlépcsős azonosítás – kód e-mailben") ------------------------

export type EmailCodeState =
  | { status: "idle" }
  | { status: "sent"; at: number }
  | { status: "error"; error: "tooSoon" | "limit" | "off" | "send" | "format" | "code" | "expired" | "generic"; at?: number };

/** Emails a 6-digit sign-in code (valid 5 minutes; a new one after 60 seconds; at most 10 a day). */
export async function sendSignInEmailCode(): Promise<EmailCodeState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const email = typeof auth?.claims.email === "string" ? auth.claims.email : null;
  if (!auth?.claims || !email) return { status: "error", error: "generic" };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await supabase.rpc("start_two_step_email", { p_code_hash: hashCode(code) });
  if (error) {
    if (error.message === "too_soon") return { status: "error", error: "tooSoon" };
    if (error.message === "too_many_codes") return { status: "error", error: "limit" };
    if (error.message === "not_allowed") return { status: "error", error: "off" };
    console.error("two-step email start failed", error.code);
    return { status: "error", error: "generic" };
  }
  const { data: profile } = await supabase.from("profiles").select("locale").eq("id", String(auth.claims.sub)).maybeSingle();
  const sent = await sendEmail(email, signInCodeEmail({ locale: isLocale(profile?.locale) ? profile.locale : "hu", code }), "security_sign_in_code");
  if (!sent) {
    await supabase.rpc("undo_two_step_email");
    return { status: "error", error: "send" };
  }
  return { status: "sent", at: Date.now() };
}

/** The emailed code: a correct one lets this sign-in through (not "aal2": the app's code is still needed for new backup codes). */
export async function verifySignInEmailCode(prev: EmailCodeState, form: FormData): Promise<EmailCodeState> {
  const at = prev.status === "sent" ? prev.at : prev.status === "error" ? prev.at : undefined;
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!CODE_RE.test(code)) return { status: "error", error: "format", at };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_two_step_email", { p_code_hash: hashCode(code) });
  if (error) {
    console.error("two-step email confirm failed", error.code);
    return { status: "error", error: "generic", at };
  }
  if (data === "wrong") return { status: "error", error: "code", at };
  if (data !== "ok") return { status: "error", error: "expired", at };
  const { host } = await requestOrigin();
  redirect(hrefFor("portal", safeNext(form.get("next")), host));
}

/** Settings: may this person ask for a sign-in code by email? */
export async function setTwoStepEmail(on: boolean): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_two_step_email", { p_on: on });
  if (error) console.error("two-step email setting failed", error.code);
  revalidatePath("/", "layout");
  return !error;
}

// ---------- Trusted devices (canvas "Biztonságos eszközök") ------------------------------

/** Remove one trusted device, or all ("Összes eltávolítása"). */
export async function removeTrustedDevice(id: string | "all"): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false };
  const query = supabase.from("trusted_devices").delete();
  const { error } = await (id === "all" ? query.eq("user_id", String(auth.claims.sub)) : query.eq("id", id));
  if (error) return { ok: false };
  if (id === "all" || id === (await currentTrustedId())) (await cookies()).delete(TRUSTED_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true };
}
