import "server-only";
import { BRAND } from "@/config/company";

/**
 * Sends one SMS through Twilio (Programmable Messaging) with the alphanumeric sender "Keyfly".
 * Credentials live only in Vercel: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN. Without them (local) nothing is sent.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.error("sms not configured");
    return false;
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: BRAND.name, To: to, Body: body }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { code?: number } | null;
      console.error("sms failed", res.status, err?.code);
      return false;
    }
    return true;
  } catch (e) {
    console.error("sms unreachable", e instanceof Error ? e.name : "error");
    return false;
  }
}
