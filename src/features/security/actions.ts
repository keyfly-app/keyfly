"use server";

import { createHash, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { securityEmail } from "@/features/invitations/emails";
import { appUrl, sendEmail } from "@/features/invitations/send";
import { isLocale } from "@/i18n/config";
import { requestOrigin } from "@/lib/request-origin";
import { safeNext } from "@/lib/safe-next";
import { hrefFor } from "@/lib/sites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: String(form.get("factorId") ?? ""), code });
  if (error) return { status: "error", error: mfaError(error.code) };
  const codes = await saveCodes(supabase);
  if (!codes) return { status: "error", error: "generic" };
  await notify(supabase, "twoStepOn");
  revalidatePath("/", "layout");
  return { status: "codes", codes };
}

/** New backup codes (the old ones stop working). Needs the second factor, which this session has. */
export async function renewBackupCodes(): Promise<{ status: "codes"; codes: string[] } | { status: "error" }> {
  const supabase = await createClient();
  const codes = await saveCodes(supabase);
  revalidatePath("/", "layout");
  return codes ? { status: "codes", codes } : { status: "error" };
}

export type OffState = { status: "idle" } | { status: "error"; error: MfaError | "format" };

/** Turning it off asks for a current code once more, then removes the authenticator and the backup codes. */
export async function turnOffTwoStep(_: OffState, form: FormData): Promise<OffState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!CODE_RE.test(code)) return { status: "error", error: "format" };
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (!factor) return { status: "error", error: "generic" };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { status: "error", error: mfaError(error.code) };
  await supabase.rpc("delete_recovery_codes");
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
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (!factor) return { status: "error", error: "generic" };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { status: "error", error: mfaError(error.code) };
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
  await supabase.auth.refreshSession();
  await notify(supabase, "recoveryUsed");
  const { host } = await requestOrigin();
  redirect(hrefFor("portal", "/settings/security?recovered=1", host));
}
