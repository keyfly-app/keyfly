import "server-only";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { callingCode, isCountryCode, nationalDigits, SMS_COUNTRIES } from "./phone";

export type SmsPhone = { ok: true; e164: string } | { ok: false; error: "format" | "country" | "mobile" };

/**
 * The number an SMS code goes to (full metadata, so the line type is known): a country we can text, a number that
 * exists there and a mobile line. `text` may also be a whole E.164 number (resending to the same number).
 */
export function parseSmsPhone(country: unknown, text: string): SmsPhone {
  const raw = text.trim();
  const parsed = raw.startsWith("+")
    ? parsePhoneNumberFromString(raw)
    : isCountryCode(country)
      ? parsePhoneNumberFromString(`+${callingCode(country)}${nationalDigits(country, raw)}`)
      : undefined;
  if (!parsed?.isValid()) return { ok: false, error: "format" };
  if (!parsed.country || !isCountryCode(parsed.country, SMS_COUNTRIES)) return { ok: false, error: "country" };
  const type = parsed.getType();
  if (type && type !== "MOBILE" && type !== "FIXED_LINE_OR_MOBILE") return { ok: false, error: "mobile" };
  return { ok: true, e164: parsed.number };
}
