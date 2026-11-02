import "server-only";
import { headers } from "next/headers";
import { clientIp } from "@/lib/supabase/forwarded";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
let warned = false;

/** Is the bot check set up (both keys present)? Without them the forms work unchecked – local and before launch. */
export function turnstileEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Cloudflare Turnstile, checked on our server before any Supabase sign-in, sign-up or password reset call
 * (the token comes from the form field the widget adds: "cf-turnstile-response"). Fails closed when Cloudflare
 * cannot be reached.
 */
export async function isHuman(form: FormData): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileEnabled() || !secret) {
    if (!warned) {
      warned = true;
      console.warn("turnstile: keys missing, bot check is off");
    }
    return true;
  }
  const token = form.get("cf-turnstile-response");
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = clientIp(await headers());
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000), cache: "no-store" });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!result.success) console.error("turnstile rejected", result["error-codes"]?.join(","));
    return result.success === true;
  } catch (error) {
    console.error("turnstile unreachable", error instanceof Error ? error.name : "error");
    return false;
  }
}
