import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

/**
 * Phone numbers (canvas "Telefonszám – országkód és formázott szám"): a country code chosen apart from the number, the
 * number formatted as it is typed, stored in E.164 ("+36301234567"). Works in the browser and on the server.
 */
export type { CountryCode };

/** Where Twilio Verify texts codes (its geo permissions): EU and EEA, Switzerland, UK, Ukraine, Serbia, US, Canada. */
export const SMS_COUNTRIES: readonly CountryCode[] = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "CH", "GB", "UA", "RS", "US", "CA",
];

/** Every country with a calling code (company contact numbers). */
export const ALL_COUNTRIES: readonly CountryCode[] = getCountries();

export const callingCode = (country: CountryCode) => getCountryCallingCode(country);

/** The digits after the country code: "06 30 123 4567" (HU) → "301234567"; a leading trunk 0 goes, except in Italy. */
export function nationalDigits(country: CountryCode, text: string): string {
  let digits = text.replace(/\D/g, "");
  if (country === "HU" && digits.startsWith("06")) digits = digits.slice(2);
  else if (country !== "IT" && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 15);
}

/** "301234567" → "30 123 4567", "06301234567" → "06 30 123 4567": formatted the way the country writes it, as typed. */
export function formatNational(country: CountryCode, text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 17);
  if (!digits) return "";
  // With the national trunk prefix ("06…", "0151…") the country's own format; without it, as after the country code.
  if (digits.startsWith("0")) return new AsYouType(country).input(digits);
  const code = callingCode(country);
  return new AsYouType().input(`+${code}${digits}`).replace(new RegExp(`^\\+${code}\\s?`), "");
}

/** Country and national digits → "+36301234567", or null when the number cannot exist there. */
export function toE164(country: CountryCode, text: string): string | null {
  const parsed = parsePhoneNumberFromString(`+${callingCode(country)}${nationalDigits(country, text)}`);
  return parsed?.isValid() ? parsed.number : null;
}

/** A stored number split for the field: "+36301234567" → HU, "30 123 4567". Unknown text stays as it was. */
export function splitPhone(value: string | null | undefined, fallback: CountryCode = "HU"): { country: CountryCode; national: string } {
  if (!value) return { country: fallback, national: "" };
  const parsed = parsePhoneNumberFromString(value, fallback);
  if (!parsed?.country) return { country: fallback, national: value };
  return { country: parsed.country, national: formatNational(parsed.country, parsed.nationalNumber) };
}

/** "+36301234567" → "+36 30 123 4567". */
export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

export const isCountryCode = (value: unknown, list: readonly CountryCode[] = ALL_COUNTRIES): value is CountryCode =>
  typeof value === "string" && (list as readonly string[]).includes(value);
