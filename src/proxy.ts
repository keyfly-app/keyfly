import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, resolvePublicPath, type Locale } from "@/i18n/config";
import { localeCookie } from "@/lib/locale-cookie";
import { safeNext } from "@/lib/safe-next";
import { parseTrusted, sha256Hex, TRUSTED_COOKIE } from "@/lib/trusted-device";
import { hrefFor, isPreviewHost, PRODUCTION_HOSTS, resolveSite, SITE_PATH_PREFIX, type AppSite } from "@/lib/sites";
import { authCookieOptions, REMEMBER_COOKIE, wantsRemember } from "@/lib/supabase/session-cookies";

/**
 * Runs before every request:
 *  1. routes the request to the right surface by host (keyfly.app / app. / admin.)
 *  2. maps public URLs to the internal /[lang]/<page> routes (hu default, en under /en)
 *     and remembers the visitor's language choice (?lang= from the switch → cookie)
 *  3. refreshes the Supabase session on surfaces that need sign-in, and sends signed-out
 *     visitors to the sign-in page (signed-in visitors skip the sign-in and sign-up pages)
 *  4. admin: every page needs the second factor (aal2); until then staff are sent to /mfa
 *  5. app: someone who turned on two-step verification and signed in with the password only is sent to /two-step
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

  if (site === "marketing" && !isAppPath) return response;

  const app = appLocation(site, pathname);
  const session = await refreshSession(request, response, app?.site);
  if (!app) return response;
  const redirectTo = authRedirect(app.site, app.path, session, request.nextUrl.searchParams.get("next"));
  if (!redirectTo) return response;

  const target = NextResponse.redirect(new URL(hrefFor(app.site, redirectTo, host), request.url), 307);
  response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

/** Pages a signed-out visitor may open, per surface (paths as the visitor sees them on the app host). */
const PUBLIC_APP_PATHS: Record<AppSite, string[]> = {
  portal: ["/login", "/register", "/verify-email", "/forgot-password", "/auth/", "/invite/"],
  admin: ["/login", "/forgot-password", "/auth/", "/invite/"],
};
/** Pages that make no sense once signed in. */
const SIGNED_OUT_ONLY = ["/login", "/register", "/verify-email", "/forgot-password"];
/** Admin pages a signed-in user may open before the second factor: the code itself, email links, the staff invitation. */
const BEFORE_SECOND_FACTOR = ["/mfa", "/auth/", "/invite/"];
/** App pages open before the two-step code: the code screen itself and email links. */
const BEFORE_TWO_STEP = ["/two-step", "/auth/"];

function matches(path: string, list: string[]) {
  return list.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p));
}

/** Which app surface a request belongs to, and its path without the /portal or /admin prefix. */
function appLocation(site: ReturnType<typeof resolveSite>, pathname: string): { site: AppSite; path: string } | null {
  for (const [target, prefix] of Object.entries(SITE_PATH_PREFIX) as [AppSite, string][]) {
    if (site !== "marketing" && site !== target) continue;
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return { site: target, path: pathname.slice(prefix.length) || "/" };
    if (site === target) return { site: target, path: pathname };
  }
  return null;
}

type Session = { signedIn: boolean; aal: string | null; needsTwoStep: boolean };

function authRedirect(site: AppSite, path: string, session: Session, next: string | null): string | null {
  if (!session.signedIn && !matches(path, PUBLIC_APP_PATHS[site])) {
    return path === "/" ? "/login" : `/login?next=${encodeURIComponent(path)}`;
  }
  if (session.signedIn && matches(path, SIGNED_OUT_ONLY)) return safeNext(next);
  if (site === "admin" && session.signedIn && session.aal !== "aal2" && !matches(path, BEFORE_SECOND_FACTOR)) {
    return path === "/" ? "/mfa" : `/mfa?next=${encodeURIComponent(path)}`;
  }
  if (site === "portal" && session.needsTwoStep && !matches(path, BEFORE_TWO_STEP)) {
    return path === "/" ? "/two-step" : `/two-step?next=${encodeURIComponent(path)}`;
  }
  return null;
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
  response.cookies.set(localeCookie(locale, host));
}

async function refreshSession(request: NextRequest, response: NextResponse, site: AppSite | undefined): Promise<Session> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { signedIn: false, aal: null, needsTwoStep: false };
  const remember = wantsRemember(request.cookies.get(REMEMBER_COOKIE)?.value);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, authCookieOptions(value, options, remember)));
      },
    },
  });
  // Refreshes an expired token; pages and RLS do the actual authorization.
  const { data } = await supabase.auth.getClaims();
  const aal = typeof data?.claims.aal === "string" ? data.claims.aal : null;
  // Read from the session itself (no network): does this person have a verified authenticator still to use?
  let needsTwoStep = false;
  if (data?.claims && aal !== "aal2") {
    const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsTwoStep = level?.nextLevel === "aal2";
    // A browser the person marked as trusted skips the code for 30 days (customer app only; staff always need it).
    const trusted = site === "portal" && needsTwoStep ? parseTrusted(request.cookies.get(TRUSTED_COOKIE)?.value) : null;
    if (trusted) {
      const { data: ok } = await supabase.rpc("trusted_device_ok", { p_token_hash: await sha256Hex(trusted.token) });
      needsTwoStep = !ok;
    }
  }
  return { signedIn: Boolean(data?.claims), aal, needsTwoStep };
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|email/|favicon.svg|apple-touch-icon.png|og/|robots.txt|sitemap.xml).*)"],
};
