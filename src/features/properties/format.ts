import type { Locale } from "@/i18n/config";
import { streetLine, type AddressParts } from "@/lib/address";
import { number } from "@/lib/format";

/** The address as a property's subtitle: "1138 Budapest, Hajóépítő sétány 4. C lph. fszt. 4." */
export const addressLine = (a: AddressParts) => `${a.postalCode} ${a.city}, ${streetLine(a)}`;

/** The name shown everywhere: the given name, or the street line when there is none. */
export const displayName = (label: string | null, a: AddressParts) => label?.trim() || streetLine(a);

/** "dec. 31." / "31 Dec" – a date within the coming months, without the year. */
export function shortDate(iso: string, locale: Locale): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "hu-HU", {
    month: "short",
    day: "numeric",
    timeZone: "Europe/Budapest",
  }).format(d);
}

/** Floor area with the locale's decimal mark: 54, 54,5 / 54.5. */
export const areaNumber = (area: number, locale: Locale) => number(Number(area), locale);

type T = (key: string, values?: Record<string, string | number>) => string;

/** "54 m² · 2 + 1 fél"; only what is known. */
export function sizeText(
  t: T,
  locale: Locale,
  p: {
    area_m2: number | null;
    rooms: number | null;
    half_rooms: number | null;
  },
): string {
  const parts: string[] = [];
  if (p.area_m2 != null) parts.push(t("area", { area: areaNumber(p.area_m2, locale) }));
  const rooms = roomsText(t, p.rooms, p.half_rooms);
  if (rooms) parts.push(rooms);
  return parts.join(" · ");
}

/** "2 + 1 fél", "2", "1 fél"; empty when neither is known. */
export function roomsText(t: T, rooms: number | null, half: number | null): string {
  if (rooms != null && half) return t("roomsHalf", { rooms, half });
  if (rooms != null) return t("rooms", { rooms });
  if (half) return t("halfOnly", { half });
  return "";
}

/** 320000 → "320 000" for amount fields (the saves accept spaces); anything that is not a whole number stays as typed. */
export const groupDigits = (v: number | string | null | undefined) => {
  const digits = v == null ? "" : String(v).replace(/\s/g, "");
  return /^\d+$/.test(digits) ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : v == null ? "" : String(v);
};
