import type { MetadataRoute } from "next";
import { BRAND } from "@/config/company";
import { DEFAULT_LOCALE, LOCALES, PUBLIC_PAGES, publicHref, type PublicPage } from "@/i18n/config";

/** Every public page in every language, each listing its translations (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (page: PublicPage, locale: (typeof LOCALES)[number]) => `${BRAND.url}${publicHref(page, locale)}`;
  return (Object.keys(PUBLIC_PAGES) as PublicPage[]).flatMap((page) =>
    LOCALES.map((locale) => ({
      url: url(page, locale),
      priority: page === "home" ? 1 : 0.3,
      alternates: {
        languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(page, l)])), "x-default": url(page, DEFAULT_LOCALE) },
      },
    })),
  );
}
