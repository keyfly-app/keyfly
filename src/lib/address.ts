import type { Enums } from "@/lib/supabase/database.types";

/**
 * Hungarian postal addresses, formatted the way they are written on a lease:
 * "Dózsa György út 30. B ép. 2. lph. 1. em. 3." and "1068 Budapest, VI. kerület".
 * Addresses stay in Hungarian in both UI languages (they are postal data, not copy).
 */
export type AddressParts = {
  postalCode: string;
  city: string;
  streetName: string;
  streetType: string;
  houseNumber: string;
  building?: string | null;
  staircase?: string | null;
  floorType?: Enums<"floor_type"> | null;
  floorNumber?: number | null;
  door?: string | null;
};

/** Address columns as stored on properties and lease requests. */
export const ADDRESS_COLUMNS = "postal_code, city, street_name, street_type, house_number, building, staircase, floor_type, floor_number, door";

export type AddressRow = {
  postal_code: string;
  city: string;
  street_name: string;
  street_type: string;
  house_number: string;
  building: string | null;
  staircase: string | null;
  floor_type: Enums<"floor_type"> | null;
  floor_number: number | null;
  door: string | null;
};

export function addressFromRow(r: AddressRow): AddressParts {
  return {
    postalCode: r.postal_code,
    city: r.city,
    streetName: r.street_name,
    streetType: r.street_type,
    houseNumber: r.house_number,
    building: r.building,
    staircase: r.staircase,
    floorType: r.floor_type,
    floorNumber: r.floor_number,
    door: r.door,
  };
}

/** Suggestions for the street type field (any value is accepted). */
export const STREET_TYPES = ["utca", "út", "útja", "tér", "körút", "sor", "köz", "fasor", "sétány", "rakpart", "park", "lakótelep", "liget", "dűlő", "lejtő", "udvar"] as const;

/** Floors offered in the floor select: special floors and 1–20. */
export const FLOOR_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

const FLOOR_SHORT: Record<Exclude<Enums<"floor_type">, "numbered">, string> = {
  basement: "pince",
  ground: "fszt.",
  raised_ground: "mfszt.",
  mezzanine: "félem.",
  attic: "tetőtér",
};

/** "30" → "30.", "2" → "2."; anything else (30/A, 12–14) as typed. */
export function withDot(value: string): string {
  const v = value.trim();
  return /^\d+$/.test(v) ? `${v}.` : v;
}

export function streetLine(a: AddressParts): string {
  const parts = [`${a.streetName} ${a.streetType} ${a.houseNumber}`];
  if (a.building) parts.push(`${a.building} ép.`);
  if (a.staircase) parts.push(`${a.staircase} lph.`);
  if (a.floorType === "numbered") {
    if (a.floorNumber) parts.push(`${a.floorNumber}. em.`);
  } else if (a.floorType) parts.push(FLOOR_SHORT[a.floorType]);
  if (a.door) parts.push(a.door);
  return parts.join(" ");
}

const ROMAN: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];

function roman(n: number): string {
  let out = "";
  for (const [value, letters] of ROMAN) while (n >= value) [out, n] = [out + letters, n - value];
  return out;
}

/** Budapest district from the postcode (1068 → 6), as the database derives it. */
export function budapestDistrict(postalCode: string, city: string): number | null {
  if (city.trim() !== "Budapest" || !/^1\d{3}$/.test(postalCode)) return null;
  const district = Number(postalCode.slice(1, 3));
  return district >= 1 && district <= 23 ? district : null;
}

export function cityLine(a: Pick<AddressParts, "postalCode" | "city">): string {
  const district = budapestDistrict(a.postalCode, a.city);
  return `${a.postalCode} ${a.city}${district ? `, ${roman(district)}. kerület` : ""}`;
}

/** One line for summaries and emails: "Dózsa György út 30. B ép. 2. lph. 1. em. 3., 1068 Budapest". */
export function fullAddress(a: AddressParts): string {
  return `${streetLine(a)}, ${a.postalCode} ${a.city}`;
}
