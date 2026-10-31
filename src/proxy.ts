import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, resolvePublicPath, type Locale } from "@/i18n/config";
import { isPreviewHost, PRODUCTION_HOSTS, resolveSite, SITE_PATH_PREFIX } from "@/lib/sites";

/**
 * Runs before every request:
 *  1. routes the request to the right surface by host (keyfly.app / app. / admin.)
 *  2. maps public URLs to the internal /[lang]/<page> routes (hu default, en under /en)
 *     and remembers the visitor's language choice (?lang= from the switch → cookie)
 *  3. refreshes the Supabase session on surfaces that need sign-in
 */
export async function proxy(request: NextRequest) {
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
  const { pathname, search, searchParams } = request.nextUrl;

  // Language switch: store the choice, then continue on the clean URL.
  const chosen = searchParams.get("lang");
  if (isLocale(chosen)) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    const response = NextResponse.redirect(url, 303);
    setLocaleCookie(response, chosen, request.headers.get("host"));
    return response;
  }

  // A returning visitor who chose English lands on the English home page.
  if (pathname === "/" && request.cookies.get(LOCALE_COOKIE)?.value === "en") {
    const url = request.nextUrl.clone();
    url.pathname = "/en";
    return NextResponse.redirect(url, 307);
  }

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

/** Remembers the language for a year, shared with app. and admin. on keyfly.app hosts. */
function setLocaleCookie(response: NextResponse, locale: Locale, host: string | null) {
  const hostname = (host ?? "").toLowerCase().split(":")[0];
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: hostname !== "localhost" && hostname !== "127.0.0.1",
    domain: hostname.endsWith("keyfly.app") ? ".keyfly.app" : undefined,
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
  matcher: ["/((?!_next/static|_next/image|email/|favicon.svg|apple-touch-icon.png|og/|robots.txt|sitemap.xml).*)"],
};
