import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { SIGN_UP_OPEN } from "@/config/auth";
import { hasAcceptedTerms, isFreshGoogleAccount, removeUnfinishedAccount } from "@/features/auth/google";
import { RESET_COOKIE, RESET_VALID_SECONDS } from "@/lib/reset-pass";
import { safeNext } from "@/lib/safe-next";
import { hrefFor, type AppSite } from "@/lib/sites";
import { createAuthClient, createClient } from "@/lib/supabase/server";

const EMAIL_LINK_TYPES: EmailOtpType[] = ["signup", "recovery", "email_change", "email"];

function respond(request: NextRequest, site: AppSite, path: string) {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return NextResponse.redirect(new URL(hrefFor(site, path, host), `${proto}://${host}`));
}

/**
 * Email links (sign-up confirmation, password reset, email change). The email templates point here
 * with a token hash, so the link works in any browser – not only the one that asked for it.
 */
export async function handleEmailLink(request: NextRequest, site: AppSite) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (tokenHash && type && EMAIL_LINK_TYPES.includes(type)) {
    const { error } = await (await createAuthClient()).auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && type === "recovery") {
      const response = respond(request, site, "/reset-password");
      response.cookies.set(RESET_COOKIE, "1", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: RESET_VALID_SECONDS });
      return response;
    }
    if (!error) return respond(request, site, next);
    console.error("email link failed", error.code);
  }
  return respond(request, site, "/login?error=link");
}

/**
 * Code exchange (PKCE) – for Google sign-in, sign-up and linking (canvas v2.4), and for email links opened in the
 * same browser that requested them. A Google account that is new to Keyfly goes on to accept the terms first; while
 * sign-up is closed it is removed again. Linking errors go back to the security page.
 */
export async function handleAuthCallback(request: NextRequest, site: AppSite) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const linking = next.startsWith("/settings/security");
  const failed = searchParams.get("error_code") ?? searchParams.get("error");
  if (failed) {
    console.error("oauth callback error", failed);
    if (linking) return respond(request, site, `/settings/security?google=${failed === "identity_already_exists" ? "taken" : "error"}`);
    return respond(request, site, failed === "access_denied" ? "/login" : "/login?error=google");
  }
  if (code) {
    const { error } = await (await createAuthClient()).auth.exchangeCodeForSession(code);
    if (!error) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const googleOnly = Boolean(user) && !(user?.identities ?? []).some((i) => i.provider === "email");
      if (site === "portal" && user && googleOnly && !linking && !(await hasAcceptedTerms(supabase, user.id))) {
        if (!SIGN_UP_OPEN && isFreshGoogleAccount(user)) {
          await removeUnfinishedAccount(user.id);
          await supabase.auth.signOut({ scope: "local" });
          return respond(request, site, "/login?error=googleNoAccount");
        }
        return respond(request, site, `/register/google${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`);
      }
      return respond(request, site, next);
    }
    console.error("code exchange failed", error.code);
  }
  return respond(request, site, linking ? "/settings/security?google=error" : "/login?error=link");
}
