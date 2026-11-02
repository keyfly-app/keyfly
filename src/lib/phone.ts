/**
 * Phone numbers for the SMS check (canvas "Telefonszám megerősítése"). Stored in E.164 ("+36301234567").
 * Countries match the geographic permissions set in Twilio: EU and EEA, Switzerland, the United Kingdom, Ukraine,
 * Serbia, the United States and Canada (Twilio Verify picks a sender that works in each).
 */
const CALLING_CODES = [
  "1", "30", "31", "32", "33", "34", "351", "352", "353", "354", "356", "357", "358", "359", "36", "370", "371", "372",
  "380", "381", "385", "386", "39", "40", "41", "420", "421", "423", "43", "44", "45", "46", "47", "48", "49",
];

export type ParsedPhone = { ok: true; e164: string } | { ok: false; error: "format" | "country" | "mobile" };

/** "06 30 123 4567", "+36-30/123-4567", "0036301234567" → "+36301234567". */
export function parsePhone(input: string): ParsedPhone {
  let s = input.replace(/[\s()./-]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  else if (s.startsWith("06")) s = `+36${s.slice(2)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return { ok: false, error: "format" };
  const code = CALLING_CODES.filter((c) => s.startsWith(`+${c}`)).sort((a, b) => b.length - a.length)[0];
  if (!code) return { ok: false, error: "country" };
  // Hungarian SMS reach mobile numbers only: 20, 30, 31, 50, 70 + seven digits.
  if (code === "36" && !/^\+36(20|30|31|50|70)\d{7}$/.test(s)) return { ok: false, error: "mobile" };
  return { ok: true, e164: s };
}

/** "+36301234567" → "+36 30 123 4567"; other countries in groups of three after the code. */
export function formatPhone(e164: string): string {
  const hu = e164.match(/^\+36(\d{2})(\d{3})(\d{4})$/);
  if (hu) return `+36 ${hu[1]} ${hu[2]} ${hu[3]}`;
  const code = CALLING_CODES.filter((c) => e164.startsWith(`+${c}`)).sort((a, b) => b.length - a.length)[0];
  if (!code) return e164;
  const rest = e164.slice(code.length + 1).replace(/(\d{3})(?=\d{2})/g, "$1 ");
  return `+${code} ${rest}`;
}
