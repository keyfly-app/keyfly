import { LOCALE_COOKIE, type Locale } from "@/i18n/config";

/**
 * The remembered language: one year, shared by keyfly.app, app. and admin. (and their staging hosts),
 * so a choice made anywhere applies everywhere.
 */
export function localeCookie(locale: Locale, host: string | null) {
  const hostname = (host ?? "").toLowerCase().split(":")[0];
  return {
    name: LOCALE_COOKIE,
    value: locale,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: hostname !== "localhost" && hostname !== "127.0.0.1",
    domain: hostname.endsWith("keyfly.app") ? ".keyfly.app" : undefined,
  };
}
