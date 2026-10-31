import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEFAULT_LOCALE, resolvePublicPath } from "@/i18n/config";
import { isPreviewHost, PRODUCTION_HOSTS, resolveSite, SITE_PATH_PREFIX } from "@/lib/sites";

/**
 * Runs before every request:
 *  1. staging password protection (STAGING_BASIC_AUTH)
 *  2. routes the request to the right surface by host (keyfly.app / app. / admin.)
 *  3. maps public URLs to the internal /[lang]/<page> routes (hu default, en under /en)
 *  4. refreshes the Supabase session on surfaces that need sign-in
 */
export async function proxy(request: NextRequest) {
  const auth = stagingAuth(request);
  if (auth) return auth;

  const host = request.headers.get("host");
  const site = resolveSite(host);
  const { pathname, search } = request.nextUrl;
  const isAppPath = Object.values(SITE_PATH_PREFIX).some((p) => pathname === p || pathname.startsWith(p + "/"));

  // App surfaces are not reachable through the public domain itself.
  if (site === "marketing" && isAppPath && !isPreviewHost(host)) {
    for (const [target, prefix] of Object.entries(SITE_PATH_PREFIX)) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        const rest = pathname.slice(prefix.length) || "/";
        const targetHost = PRODUCTION_HOSTS[target as keyof typeof SITE_PATH_PREFIX];
        return NextResponse.redirect(new URL(rest + search, `https://${targetHost}`));
      }
    }
  }

  let response: NextResponse;
  if (site === "marketing" && !isAppPath) {
    response = routePublic(request);
  } else if (site === "marketing") {
    response = NextResponse.next({ request }); // preview host: /portal, /admin directly
  } else {
    const prefix = SITE_PATH_PREFIX[site];
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith(prefix) ? pathname : prefix + (pathname === "/" ? "" : pathname);
    response = NextResponse.rewrite(url, { request });
  }

  if (site !== "marketing" || isAppPath) await refreshSession(request, response);
  return response;
}

function routePublic(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Canonical URLs: Hungarian has no prefix.
  if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  const match = resolvePublicPath(pathname);
  const url = request.nextUrl.clone();
  if (match) {
    const internal = match.page === "home" ? "" : `/${match.page}`;
    url.pathname = `/${match.locale}${internal}`;
  } else {
    // Unknown public path → the localized 404 page.
    const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : DEFAULT_LOCALE;
    url.pathname = `/${locale}/__not-found${pathname}`;
  }
  url.search = search;
  return NextResponse.rewrite(url, { request });
}

function stagingAuth(request: NextRequest) {
  const expected = process.env.STAGING_BASIC_AUTH; // "user:password"
  if (!expected) return null;
  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded && atob(encoded) === expected) return null;
  return new NextResponse("Keyfly staging – sign-in required.", {
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
  // Refreshes an expired token; pages and RLS do the actual authorization.
  await supabase.auth.getClaims();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|apple-touch-icon.png|og.png|robots.txt).*)"],
};
