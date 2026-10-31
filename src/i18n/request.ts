import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Public pages pass their locale explicitly (the [lang] segment).
 * App surfaces (app., admin.) fall back to the visitor's saved choice, then Hungarian.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!isLocale(locale)) {
    const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
    locale = isLocale(saved) ? saved : DEFAULT_LOCALE;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Europe/Budapest",
  };
});
