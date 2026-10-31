import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hrefFor } from "@/lib/sites";

/**
 * A belépési linkből visszatérve beváltja a kódot munkamenetre.
 * A felhasználó a látható domainen marad (pl. app.keyfly.app/), a belső /portal előtagot a proxy kezeli.
 */
export async function handleAuthCallback(request: NextRequest, site: "portal" | "admin") {
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
  return NextResponse.redirect(new URL(hrefFor(site, "/login", host) + "?hiba=link", origin));
}
