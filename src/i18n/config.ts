export const LOCALES = ["hu", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "hu";
/** Cookie that remembers the visitor's language choice (set by the language switch). */
export const LOCALE_COOKIE = "keyfly_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Public-site pages and their localized URL slugs.
 * Hungarian is the default (no prefix); English lives under /en.
 */
export const PUBLIC_PAGES = {
  home: { hu: "/", en: "/" },
  privacy: { hu: "/adatvedelem", en: "/privacy" },
  imprint: { hu: "/impresszum", en: "/imprint" },
  terms: { hu: "/aszf", en: "/terms" },
  appPrivacy: { hu: "/adatvedelem/app", en: "/privacy/app" },
  pro: { hu: "/pro", en: "/pro" },
} as const;
export type PublicPage = keyof typeof PUBLIC_PAGES;

/** Visible URL for a public page in a given language, e.g. ("privacy","en") → "/en/privacy". */
export function publicHref(page: PublicPage, locale: Locale): string {
  const slug = PUBLIC_PAGES[page][locale];
  if (locale === DEFAULT_LOCALE) return slug;
  return slug === "/" ? "/en" : `/en${slug}`;
}

/** Maps a visible public URL to { locale, page } – or null if it isn't a known page. */
export function resolvePublicPath(pathname: string): { locale: Locale; page: PublicPage } | null {
  let locale: Locale = DEFAULT_LOCALE;
  let rest = pathname;
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    locale = "en";
    rest = pathname.slice(3) || "/";
  }
  const clean = rest.length > 1 ? rest.replace(/\/$/, "") : rest;
  for (const [page, slugs] of Object.entries(PUBLIC_PAGES)) {
    if (slugs[locale] === clean) return { locale, page: page as PublicPage };
  }
  return null;
}
