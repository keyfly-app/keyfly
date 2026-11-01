import type { Metadata, Viewport } from "next";
import { BRAND } from "@/config/company";
import { DEFAULT_LOCALE, LOCALES, publicHref, type Locale, type PublicPage } from "@/i18n/config";

const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";

/** Open Graph locale codes (Hungarian for Hungary, British English for international visitors). */
const OG_LOCALE: Record<Locale, string> = { hu: "hu_HU", en: "en_GB" };

export const baseViewport: Viewport = { themeColor: BRAND.themeColor };

/** Social-share card for a language: per-locale image with the slogan in that language. */
function openGraph(locale: Locale, url?: string): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    siteName: BRAND.name,
    locale: OG_LOCALE[locale],
    alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    url,
    images: [{ url: `/og/${locale}.jpg`, width: 1200, height: 630 }],
  };
}

/** Metadata shared by every surface. Staging and previews are never indexed. */
export function baseMetadata(title: string, description: string, locale: Locale = DEFAULT_LOCALE): Metadata {
  return {
    metadataBase: new URL(BRAND.url),
    title: { default: title, template: `%s · ${BRAND.name}` },
    description,
    icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
    openGraph: openGraph(locale),
    twitter: { card: "summary_large_image" },
    robots: isProduction ? undefined : { index: false, follow: false },
  };
}

/** Canonical URL, hreflang alternates and the share card's URL for a public page. */
export function publicPageMetadata(page: PublicPage, locale: Locale): Metadata {
  const canonical = publicHref(page, locale);
  return {
    alternates: {
      canonical,
      languages: { hu: publicHref(page, "hu"), en: publicHref(page, "en"), "x-default": publicHref(page, DEFAULT_LOCALE) },
    },
    openGraph: openGraph(locale, canonical),
  };
}

/**
 * Title for the page that shares a segment with the root layout (e.g. the portal home):
 * the layout's "%s · Keyfly" template only applies to child segments, so the suffix is added here.
 */
export function rootSegmentTitle(title: string): Metadata["title"] {
  return { absolute: `${title} · ${BRAND.name}` };
}
