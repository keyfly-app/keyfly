import type { Locale } from "@/i18n/config";

const NBSP = " ";

/** Money in whole forints. hu: "1 050 000 Ft" (non-breaking spaces), en: "HUF 1,050,000". */
export function money(amount: number | null | undefined, locale: Locale): string {
  if (amount == null) return "–";
  if (locale === "en") return `HUF${NBSP}${new Intl.NumberFormat("en-GB").format(amount)}`;
  const digits = new Intl.NumberFormat("hu-HU", { useGrouping: true }).format(amount).replace(/\s/g, NBSP);
  return `${digits}${NBSP}Ft`;
}

/** Plain number with the locale's grouping, e.g. hu "350 000", en "350,000". */
export function number(value: number, locale: Locale): string {
  const out = new Intl.NumberFormat(locale === "en" ? "en-GB" : "hu-HU").format(value);
  return out.replace(/\s/g, NBSP);
}

/** Date. hu: "2026. 12. 01.", en: "1 Dec 2026". Always shown in Budapest time. */
export function date(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (locale === "en") {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Budapest" }).format(d);
  }
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Budapest" }).format(d);
}

/** Date before a suffix such as "-ig": hu "2026. 11. 08" (no closing dot), en "8 Nov 2026". */
export function dateBeforeSuffix(iso: string, locale: Locale): string {
  const d = date(iso, locale);
  return locale === "hu" ? d.replace(/\.$/, "") : d;
}
