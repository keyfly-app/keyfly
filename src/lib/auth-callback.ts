import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hrefFor, type AppSite } from "@/lib/sites";

/**
 * Exchanges the code from a sign-in link for a session.
 * The user stays on the visible host (e.g. app.keyfly.app/); the proxy handles the internal /portal prefix.
 */
export async function handleAuthCallback(request: NextRequest, site: AppSite) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(hrefFor(site, next, host), origin));
  }
  return NextResponse.redirect(new URL(hrefFor(site, "/login", host) + "?error=link", origin));
}
