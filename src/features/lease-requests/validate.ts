/**
 * Field rules for the tenant's lease request and the landlord's review – shared by the forms (instant feedback)
 * and the server actions (authoritative, together with the database checks).
 */
import { isPropertyKind } from "@/config/property-kinds";

export type FieldError = "required" | "kind" | "postalCode" | "amount" | "date" | "endBeforeStart" | "ended" | "email" | "self";
export type Values = Record<string, string>;
export type Errors = Partial<Record<string, FieldError>>;

export const ADDRESS_FIELDS = ["postalCode", "city", "streetName", "streetType", "houseNumber", "building", "staircase", "floor", "door"] as const;
export const TERM_FIELDS = ["startDate", "term", "endDate", "monthlyRent", "deposit"] as const;
export const LANDLORD_FIELDS = ["landlordEmail", "landlordName"] as const;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 1_000_000_000;

/** "280 000", "280000 Ft", "280.000" → 280000; "" → null; anything else → NaN. */
export function parseAmount(value: string | undefined): number | null {
  const v = (value ?? "").replace(/[\s .,]|Ft|HUF/gi, "");
  if (!v) return null;
  return /^\d+$/.test(v) ? Number(v) : Number.NaN;
}

/** Named floors in the order the floor field offers them (canvas "Meghívás 1 – emelet"). */
export const NAMED_FLOORS = ["ground", "raised_ground", "mezzanine", "basement", "attic"] as const;
export const MAX_FLOOR = 99;

/** Floor value: "" (none), a named floor, or "numbered:28". */
export function parseFloor(value: string | undefined): { floorType: string | null; floorNumber: number | null } {
  const v = value ?? "";
  if (v.startsWith("numbered:")) {
    const n = Number(v.slice(9));
    return Number.isInteger(n) && n >= 1 && n <= MAX_FLOOR ? { floorType: "numbered", floorNumber: n } : { floorType: null, floorNumber: null };
  }
  if (!(NAMED_FLOORS as readonly string[]).includes(v)) return { floorType: null, floorNumber: null };
  return { floorType: v || null, floorNumber: null };
}

/** Today in Budapest as YYYY-MM-DD. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date());
}

const filled = (v: Values, key: string) => (v[key] ?? "").trim() !== "";

export function validateAddress(v: Values): Errors {
  const e: Errors = {};
  if (!isPropertyKind(v.propertyKind)) e.propertyKind = "kind";
  for (const key of ["postalCode", "city", "streetName", "streetType", "houseNumber"]) if (!filled(v, key)) e[key] = "required";
  if (!e.postalCode && !/^\d{4}$/.test(v.postalCode.trim())) e.postalCode = "postalCode";
  return e;
}

/** Start, term (fixed / open), end, rent, optional deposit. */
export function validateTerms(v: Values): Errors {
  const e: Errors = {};
  if (!DATE_RE.test(v.startDate ?? "")) e.startDate = filled(v, "startDate") ? "date" : "required";
  if (v.term !== "open") {
    if (!DATE_RE.test(v.endDate ?? "")) e.endDate = filled(v, "endDate") ? "date" : "required";
    else if (!e.startDate && v.endDate < v.startDate) e.endDate = "endBeforeStart";
    else if (v.endDate < todayIso()) e.endDate = "ended";
  }
  const rent = parseAmount(v.monthlyRent);
  if (rent === null) e.monthlyRent = "required";
  else if (!(rent > 0 && rent <= MAX_AMOUNT)) e.monthlyRent = "amount";
  const deposit = parseAmount(v.deposit);
  if (deposit !== null && !(deposit >= 0 && deposit <= MAX_AMOUNT)) e.deposit = "amount";
  return e;
}

export function validateLandlord(v: Values, myEmail?: string): Errors {
  const e: Errors = {};
  const email = (v.landlordEmail ?? "").trim().toLowerCase();
  if (!email) e.landlordEmail = "required";
  else if (!EMAIL_RE.test(email) || email.length > 254) e.landlordEmail = "email";
  else if (myEmail && email === myEmail.toLowerCase()) e.landlordEmail = "self";
  return e;
}

export const hasErrors = (e: Errors) => Object.keys(e).length > 0;

/** The same errors without one field (once the visitor edits it). */
export function clearError(e: Errors, key: string): Errors {
  const next = { ...e };
  delete next[key];
  return next;
}
