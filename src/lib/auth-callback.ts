import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/safe-next";
import { hrefFor, type AppSite } from "@/lib/sites";
import { createClient } from "@/lib/supabase/server";

const EMAIL_LINK_TYPES: EmailOtpType[] = ["signup", "magiclink", "recovery", "email_change", "email"];

function respond(request: NextRequest, site: AppSite, path: string) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return NextResponse.redirect(new URL(hrefFor(site, path, host), `${proto}://${host}`));
}

/**
 * Email links (sign-up confirmation, email sign-in, password reset). The email templates point here
 * with a token hash, so the link works in any browser – not only the one that asked for it.
 */
export async function handleEmailLink(request: NextRequest, site: AppSite) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (tokenHash && type && EMAIL_LINK_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return respond(request, site, type === "recovery" ? "/reset-password" : next);
    console.error("email link failed", error.code);
  }
  return respond(request, site, "/login?error=link");
}

/**
 * Code exchange (PKCE) – for OAuth providers such as Google, and for email links
 * opened in the same browser that requested them.
 */
export async function handleAuthCallback(request: NextRequest, site: AppSite) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return respond(request, site, next);
  }
  return respond(request, site, "/login?error=link");
}
