import "server-only";

/**
 * Phone confirmation codes through Twilio Verify (service "Keyfly"): Twilio makes the 6-digit code, picks a sender that
 * works in the destination country, texts it in the person's language and checks it. Keyfly never sees the code.
 * Credentials live only in Vercel: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID.
 */
const TIMEOUT_MS = 8000;

export type VerifyStart = "sent" | "invalid" | "blocked" | "limit" | "error";
export type VerifyCheck = "approved" | "wrong" | "expired" | "error";

async function call(path: string, body: Record<string, string>): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !service) {
    console.error("sms not configured");
    return { ok: false, status: 0, json: null };
  }
  try {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(service)}/${path}`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status, json: (await res.json().catch(() => null)) as Record<string, unknown> | null };
  } catch (e) {
    console.error("sms unreachable", e instanceof Error ? e.name : "error");
    return { ok: false, status: 0, json: null };
  }
}

/** Texts a new code to `to` (E.164) in Hungarian or English. */
export async function startVerification(to: string, locale: "hu" | "en"): Promise<VerifyStart> {
  const { ok, status, json } = await call("Verifications", { To: to, Channel: "sms", Locale: locale });
  if (ok) return "sent";
  const code = Number(json?.code);
  console.error("verify start failed", status, code);
  // 60200 invalid number · 60205 landline · 60203 / 60212 too many sends · 60410, 60605 blocked (fraud guard, geo permission).
  if (code === 60200 || code === 60205) return "invalid";
  if (code === 60203 || code === 60212 || status === 429) return "limit";
  if (code === 60410 || code === 60605) return "blocked";
  return "error";
}

/** Checks the code typed for `to`. */
export async function checkVerification(to: string, code: string): Promise<VerifyCheck> {
  const { ok, status, json } = await call("VerificationCheck", { To: to, Code: code });
  if (ok) return json?.status === "approved" ? "approved" : "wrong";
  // 404 (20404): no open verification – expired, already used or too many wrong tries.
  if (status === 404 || Number(json?.code) === 20404 || Number(json?.code) === 60202) return "expired";
  console.error("verify check failed", status, Number(json?.code));
  return "error";
}
