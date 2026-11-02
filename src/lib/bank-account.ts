import { HU_BANKS } from "@/config/hu-banks";

/**
 * Bank account numbers (canvas "Bankszámla hozzáadása"): a Hungarian 16- or 24-digit number or any IBAN, typed with or
 * without spaces and hyphens. Checked here (Hungarian check digits, IBAN mod 97) and stored as IBAN. Runs in the browser
 * and on the server; nothing leaves Keyfly.
 */

export type ParsedAccount =
  | { ok: true; iban: string; country: string; domestic: string | null; bank: { name: string; bic: string | null } | null }
  | { ok: false; error: "empty" | "format" | "checksum" };

/** 9-7-3-1 weights over the first seven digits of each 8-digit block; the eighth is the check digit. */
function huBlockOk(block: string): boolean {
  const w = [9, 7, 3, 1, 9, 7, 3];
  const sum = w.reduce((s, x, i) => s + x * Number(block[i]), 0);
  return (10 - (sum % 10)) % 10 === Number(block[7]);
}

function mod97(iban: string): number {
  const s = iban.slice(4) + iban.slice(0, 4);
  let m = 0;
  for (const ch of s) {
    const v = ch >= "A" && ch <= "Z" ? ch.charCodeAt(0) - 55 : Number(ch);
    m = (v > 9 ? m * 100 + v : m * 10 + v) % 97;
  }
  return m;
}

function ibanFromHu(bban24: string): string {
  const check = 98 - mod97(`HU00${bban24}`);
  return `HU${String(check).padStart(2, "0")}${bban24}`;
}

/** "HU08117730166111110900000000" → "11773016-61111109" (the last block is left out when it is all zeros). */
export function domesticFromIban(iban: string): string | null {
  if (!iban.startsWith("HU") || iban.length !== 28) return null;
  const b = iban.slice(4);
  const blocks = [b.slice(0, 8), b.slice(8, 16), b.slice(16)];
  return (blocks[2] === "00000000" ? blocks.slice(0, 2) : blocks).join("-");
}

/** "HU08117730166111110900000000" → "HU08 1177 3016 6111 1109 0000 0000". */
export const groupIban = (iban: string) => iban.replace(/(.{4})/g, "$1 ").trim();

export function bankOf(iban: string): { name: string; bic: string | null } | null {
  return iban.startsWith("HU") ? (HU_BANKS[iban.slice(4, 7)] ?? null) : null;
}

export function parseAccount(input: string): ParsedAccount {
  const raw = input.toUpperCase().replace(/[\s-]/g, "");
  if (!raw) return { ok: false, error: "empty" };
  let iban: string;
  if (/^\d{16}$|^\d{24}$/.test(raw)) {
    const bban = raw.padEnd(24, "0");
    if (![0, 8, 16].every((i) => huBlockOk(bban.slice(i, i + 8)))) return { ok: false, error: "checksum" };
    iban = ibanFromHu(bban);
  } else if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(raw)) {
    iban = raw;
    if (iban.startsWith("HU")) {
      if (iban.length !== 28) return { ok: false, error: "format" };
      const bban = iban.slice(4);
      if (![0, 8, 16].every((i) => huBlockOk(bban.slice(i, i + 8)))) return { ok: false, error: "checksum" };
    }
    if (mod97(iban) !== 1) return { ok: false, error: "checksum" };
  } else {
    return { ok: false, error: "format" };
  }
  return { ok: true, iban, country: iban.slice(0, 2), domestic: domesticFromIban(iban), bank: bankOf(iban) };
}

/** Currencies offered first; any ISO 4217 code is accepted. */
export const CURRENCIES = ["HUF", "EUR", "USD", "GBP", "CHF", "CZK", "PLN", "RON"] as const;
