/**
 * Excel/CSV import: column matching, reading the rows and checking each one before anything is saved
 * (canvas "Import – ellenőrzés"). Pure functions, used by the import page in the browser.
 */
export const IMPORT_FIELDS = [
  "postalCode",
  "city",
  "streetName",
  "streetType",
  "houseNumber",
  "building",
  "staircase",
  "floor",
  "door",
  "kind",
  "label",
  "ownRef",
  "area",
  "rooms",
  "halfRooms",
  "parcel",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export const REQUIRED_FIELDS: ImportField[] = ["postalCode", "city", "streetName", "streetType", "houseNumber", "kind"];
export const MAX_ROWS = 500;

export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Column → field by its name in either language (or the field's key). */
export function matchColumns(headers: string[], names: Record<ImportField, string[]>): (ImportField | null)[] {
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const f = fold(h);
    const hit = IMPORT_FIELDS.find((k) => !used.has(k) && (fold(k) === f || names[k].some((n) => fold(n) === f || fold(n.replace(/\(.*\)/, "")) === f)));
    if (hit) used.add(hit);
    return hit ?? null;
  });
}

/** CSV with comma or semicolon (Hungarian Excel), quotes and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const first = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]!;
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export type Lookup = {
  /** Type key → its names in both languages. */
  kinds: { key: string; names: string[] }[];
  /** Named floor key → its names in both languages. */
  floors: { key: string; names: string[] }[];
  /** The account's live properties, to spot duplicates. */
  existing: { id: string; name: string; ownRef: string | null; addressKey: string }[];
};

export type Problem = { code: "required" | "postalCode" | "kind" | "number" | "floor" | "parcel" | "ownRef"; field: ImportField };
export type CheckedRow = {
  index: number;
  values: Record<ImportField, string>;
  problems: Problem[];
  duplicateOf: { id: string; name: string } | null;
  payload: Record<string, string | number | null> | null;
};

export const addressKey = (a: {
  postalCode: string;
  streetName: string;
  streetType: string;
  houseNumber: string;
  building?: string | null;
  staircase?: string | null;
  floor?: string;
  door?: string | null;
}) =>
  [
    a.postalCode,
    a.streetName,
    a.streetType,
    a.houseNumber.replace(/\.$/, ""),
    a.building ?? "",
    (a.staircase ?? "").replace(/\.$/, ""),
    a.floor ?? "",
    (a.door ?? "").replace(/\.$/, ""),
  ]
    .map((x) => fold(String(x)))
    .join("|");

const withDot = (v: string) => (/^\d+$/.test(v.trim()) ? `${v.trim()}.` : v.trim());

function parseFloor(raw: string, floors: Lookup["floors"]): { type: string | null; number: number | null } | "bad" {
  const v = fold(raw);
  if (!v) return { type: null, number: null };
  const n = v.match(/^(\d{1,2})(?:\s.*)?$/);
  if (n) {
    const num = Number(n[1]);
    if (num === 0) return { type: "ground", number: null };
    return num >= 1 && num <= 99 ? { type: "numbered", number: num } : "bad";
  }
  const short: Record<string, string> = { fszt: "ground", fsz: "ground", mfszt: "raised_ground", felem: "mezzanine", pince: "basement", tetoter: "attic" };
  if (short[v]) return { type: short[v]!, number: null };
  const hit = floors.find((f) => f.names.some((x) => fold(x) === v || fold(x).startsWith(v) || v.startsWith(fold(x))));
  return hit ? { type: hit.key, number: null } : "bad";
}

function number(raw: string, integer: boolean): number | null | "bad" {
  const v = raw.trim().replace(/\s/g, "").replace(",", ".").replace(/m2|m²/i, "");
  if (!v) return null;
  if (!(integer ? /^\d+$/ : /^\d+(\.\d{1,2})?$/).test(v)) return "bad";
  return Number(v);
}

/** Checks one row and builds what the database gets. `kindOverride`: the type picked on screen for an unknown one. */
export function checkRow(index: number, values: Record<ImportField, string>, lookup: Lookup, seenRefs: Map<string, number>): CheckedRow {
  const problems: Problem[] = [];
  const v = Object.fromEntries(IMPORT_FIELDS.map((k) => [k, (values[k] ?? "").trim()])) as Record<ImportField, string>;
  for (const k of REQUIRED_FIELDS) if (!v[k]) problems.push({ code: "required", field: k });
  if (v.postalCode && !/^\d{4}$/.test(v.postalCode)) problems.push({ code: "postalCode", field: "postalCode" });
  const kind = v.kind ? lookup.kinds.find((k) => k.key === v.kind || k.names.some((n) => fold(n) === fold(v.kind))) : null;
  if (v.kind && !kind) problems.push({ code: "kind", field: "kind" });
  const floor = parseFloor(v.floor, lookup.floors);
  if (floor === "bad") problems.push({ code: "floor", field: "floor" });
  const area = number(v.area, false);
  const rooms = number(v.rooms, true);
  const half = number(v.halfRooms, true);
  for (const [k, n] of [
    ["area", area],
    ["rooms", rooms],
    ["halfRooms", half],
  ] as const)
    if (n === "bad") problems.push({ code: "number", field: k });
  const parcel = v.parcel.toUpperCase().replace(/\s+/g, "");
  if (parcel && !/^[0-9]{1,6}(\/[0-9A-Z]{1,6}){0,3}$/.test(parcel)) problems.push({ code: "parcel", field: "parcel" });
  if (v.ownRef) {
    const key = fold(v.ownRef);
    if (seenRefs.has(key) && seenRefs.get(key) !== index) problems.push({ code: "ownRef", field: "ownRef" });
    else seenRefs.set(key, index);
  }

  const key = addressKey({ ...v, floor: floor === "bad" ? v.floor : `${floor.type ?? ""}${floor.number ?? ""}` });
  const dup =
    lookup.existing.find((e) => v.ownRef && e.ownRef && fold(e.ownRef) === fold(v.ownRef)) ?? lookup.existing.find((e) => e.addressKey === key) ?? null;
  const payload =
    problems.length === 0 && floor !== "bad"
      ? {
          postal_code: v.postalCode,
          city: v.city,
          street_name: v.streetName,
          street_type: v.streetType,
          house_number: withDot(v.houseNumber),
          building: v.building || null,
          staircase: v.staircase ? withDot(v.staircase) : null,
          floor_type: floor.type,
          floor_number: floor.number,
          door: v.door ? withDot(v.door) : null,
          kind: kind!.key,
          label: v.label || null,
          own_ref: v.ownRef || null,
          area_m2: area as number | null,
          rooms: rooms as number | null,
          half_rooms: half as number | null,
          parcel_number: parcel || null,
        }
      : null;
  return { index, values: v, problems, duplicateOf: dup ? { id: dup.id, name: dup.name } : null, payload };
}
