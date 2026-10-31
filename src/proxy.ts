import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isPreviewHost, PRODUCTION_HOSTS, resolveSite, SITE_PATH_PREFIX } from "@/lib/sites";

/**
 * Minden kérés előtt fut:
 *  1. staging jelszavas védelem (STAGING_BASIC_AUTH)
 *  2. a domain alapján a megfelelő felületre irányít (keyfly.app / app. / admin.)
 *  3. frissíti a Supabase munkamenetet a bejelentkezést igénylő felületeken
 */
export async function proxy(request: NextRequest) {
  const auth = stagingAuth(request);
  if (auth) return auth;

  const host = request.headers.get("host");
  const site = resolveSite(host);
  const { pathname, search } = request.nextUrl;

  // A belső útvonalak a publikus domainen nem érhetők el közvetlenül.
  if (site === "marketing" && !isPreviewHost(host)) {
    for (const [target, prefix] of Object.entries(SITE_PATH_PREFIX)) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        const rest = pathname.slice(prefix.length) || "/";
        const targetHost = PRODUCTION_HOSTS[target as keyof typeof SITE_PATH_PREFIX];
        return NextResponse.redirect(new URL(rest + search, `https://${targetHost}`));
      }
    }
  }

  let response: NextResponse;
  if (site === "marketing") {
    response = NextResponse.next({ request });
  } else {
    const prefix = SITE_PATH_PREFIX[site];
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith(prefix) ? pathname : prefix + (pathname === "/" ? "" : pathname);
    response = NextResponse.rewrite(url, { request });
  }

  const needsSession =
    site !== "marketing" || pathname.startsWith("/portal") || pathname.startsWith("/admin");
  if (needsSession) await refreshSession(request, response);

  return response;
}

function stagingAuth(request: NextRequest) {
  const expected = process.env.STAGING_BASIC_AUTH; // "felhasznalo:jelszo"
  if (!expected) return null;
  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded && atob(encoded) === expected) return null;
  return new NextResponse("Keyfly staging – belépés szükséges.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Keyfly staging", charset="UTF-8"' },
  });
}

async function refreshSession(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Lejárt token esetén itt frissül; a jogosultságot az oldalak és az RLS ellenőrzik.
  await supabase.auth.getClaims();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|apple-touch-icon.png|og.png|robots.txt).*)"],
};
