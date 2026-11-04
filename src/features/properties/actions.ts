"use server";

import { redirect } from "next/navigation";
import { loadCatalog } from "@/features/catalog/load";
import { asksLabel, offered } from "@/features/catalog/types";
import { myAccounts } from "@/features/companies/accounts";
import { parseFloor, validateAddress, type Errors, type Values } from "@/features/lease-requests/validate";
import { withDot } from "@/lib/address";
import { hrefFor } from "@/lib/sites";
import { requestOrigin } from "@/lib/request-origin";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { savePropertyRow } from "./property-row";

export type PropertyError = "notAllowed" | "generic" | "hasLease";
export type FieldProblem = "required" | "postalCode" | "kind" | "otherLabel" | "ownRefTaken" | "number" | "range" | "parcel";
export type SaveState =
  | { status: "idle" }
  | { status: "saved" }
  | {
      status: "error";
      error?: PropertyError;
      fields?: Partial<Record<string, FieldProblem>>;
    };

const read = (form: FormData): Values => Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, String(v)]));
const text = (v: string | undefined, max: number) => {
  const t = (v ?? "").trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
};
const PARCEL_RE = /^[0-9]{1,6}(\/[0-9A-Z]{1,6}){0,3}$/;

/** The account's base path ("" or "/c/<slug>") when the user is a member who may add properties. */
async function editableBase(accountId: string): Promise<string | null> {
  const account = (await myAccounts()).find((a) => a.id === accountId);
  if (!account || !["owner", "admin", "manager"].includes(account.role)) return null;
  return account.kind === "company" ? `/c/${account.slug}` : "";
}

function dbProblem(error: { code?: string; message?: string } | null): SaveState {
  if (!error) return { status: "saved" };
  if (error.code === "23505" && error.message?.includes("own_ref")) return { status: "error", fields: { ownRef: "ownRefTaken" } };
  if (error.message === "unknown_property_type") return { status: "error", fields: { kind: "kind" } };
  if (error.message === "property_has_lease") return { status: "error", error: "hasLease" };
  if (error.code === "42501" || error.message === "not_allowed") return { status: "error", error: "notAllowed" };
  console.error("property save failed", error.code);
  return { status: "error", error: "generic" };
}

/** An update RLS filtered out touches no row: that is a refusal, not a success. */
const changed = (error: { code?: string; message?: string } | null, rows: unknown[] | null): SaveState =>
  error ? dbProblem(error) : rows?.length ? { status: "saved" } : { status: "error", error: "notAllowed" };

/** Address fields → the database's parts; numbers get their dot ("4" → "4."). */
function addressParts(v: Values) {
  const { floorType, floorNumber } = parseFloor(v.floor);
  const opt = (s: string | undefined) => text(s, 20);
  return {
    postal_code: (v.postalCode ?? "").trim(),
    city: text(v.city, 100) ?? "",
    street_name: text(v.streetName, 100) ?? "",
    street_type: text(v.streetType, 30) ?? "",
    house_number: withDot(v.houseNumber ?? ""),
    building: opt(v.building),
    staircase: opt(v.staircase) && withDot(v.staircase!),
    floor_type: floorType as Enums<"floor_type"> | null,
    floor_number: floorNumber,
    door: opt(v.door) && withDot(v.door!),
  };
}

/** "Ingatlan felvétele": address and type are required; name, own ID and the word for "other" are optional. */
export async function createProperty(_prev: SaveState, form: FormData): Promise<SaveState> {
  const v = read(form);
  const base = await editableBase(v.accountId ?? "");
  if (base === null) return { status: "error", error: "notAllowed" };
  const { property_type: types } = await loadCatalog("property_type");
  const fields: Errors = validateAddress(
    { ...v, propertyKind: v.kind ?? "" },
    offered(types).map((k) => k.key),
  );
  const problems: Partial<Record<string, FieldProblem>> = {};
  for (const [k, e] of Object.entries(fields))
    if (e) problems[k === "propertyKind" ? "kind" : k] = e === "kind" ? "kind" : e === "postalCode" ? "postalCode" : "required";
  if (v.kind && asksLabel(types, v.kind) && !text(v.otherLabel, 40)) problems.otherLabel = "otherLabel";
  if (Object.keys(problems).length) return { status: "error", fields: problems };

  const a = addressParts(v);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_property", {
    p_account_id: v.accountId!,
    p_kind: v.kind!,
    p_postal_code: a.postal_code,
    p_city: a.city,
    p_street_name: a.street_name,
    p_street_type: a.street_type,
    p_house_number: a.house_number,
    p_building: a.building ?? undefined,
    p_staircase: a.staircase ?? undefined,
    p_floor_type: a.floor_type ?? undefined,
    p_floor_number: a.floor_number ?? undefined,
    p_door: a.door ?? undefined,
    p_label: text(v.label, 120) ?? undefined,
    p_own_ref: text(v.ownRef, 30) ?? undefined,
    p_other_kind_label: text(v.otherLabel, 40) ?? undefined,
  });
  const created = data?.[0];
  if (error || !created) return dbProblem(error ?? { message: "no_row" });
  const { host } = await requestOrigin();
  redirect(hrefFor("portal", `${base}/properties/${created.public_code}?created=1`, host));
}

/** Name, own ID and type (the word for "other" only with it). */
export async function saveIdentity(_prev: SaveState, form: FormData): Promise<SaveState> {
  const v = read(form);
  const { property_type: types } = await loadCatalog("property_type");
  const known = types.some((t) => t.key === v.kind);
  if (!known) return { status: "error", fields: { kind: "kind" } };
  const other = asksLabel(types, v.kind!) ? text(v.otherLabel, 40) : null;
  if (asksLabel(types, v.kind!) && !other) return { status: "error", fields: { otherLabel: "otherLabel" } };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .update({
      label: text(v.label, 120),
      own_ref: text(v.ownRef, 30),
      kind: v.kind!,
      other_kind_label: other,
    })
    .eq("id", v.propertyId ?? "")
    .select("id");
  return changed(error, data);
}

/** The address parts and the land registry number. */
export async function saveAddress(_prev: SaveState, form: FormData): Promise<SaveState> {
  const v = read(form);
  const problems: Partial<Record<string, FieldProblem>> = {};
  for (const key of ["postalCode", "city", "streetName", "streetType", "houseNumber"]) if (!(v[key] ?? "").trim()) problems[key] = "required";
  if (!problems.postalCode && !/^\d{4}$/.test(v.postalCode!.trim())) problems.postalCode = "postalCode";
  const parcel = (v.parcel ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (parcel && !PARCEL_RE.test(parcel)) problems.parcel = "parcel";
  if (Object.keys(problems).length) return { status: "error", fields: problems };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .update({ ...addressParts(v), parcel_number: parcel || null })
    .eq("id", v.propertyId ?? "")
    .select("id");
  return changed(error, data);
}

/** A whole or decimal number within bounds; "" → null. */
function num(raw: string | undefined, min: number, max: number, integer: boolean): number | null | FieldProblem {
  const s = (raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  if (!(integer ? /^\d+$/ : /^\d+(\.\d{1,2})?$/).test(s)) return "number";
  const n = Number(s);
  return n < min || n > max ? "range" : n;
}

export type FeaturesInput = {
  propertyId: string;
  area: string;
  rooms: string;
  halfRooms: string;
  builtYear: string;
  heating: string;
  energy: string;
  parking: string;
  lift: "" | "yes" | "no";
  furnishing: string;
  outdoor: { kind: string; area: string }[];
  extras: string[];
  ownExtras: string[];
  newExtras: string[];
};

/** Features, outdoor spaces and extras in one save (the database checks every list value against the catalogue). */
export async function saveFeatures(input: FeaturesInput): Promise<SaveState> {
  const problems: Partial<Record<string, FieldProblem>> = {};
  const check = (key: string, value: number | null | FieldProblem) => {
    if (typeof value === "string") problems[key] = value;
    return typeof value === "number" ? value : null;
  };
  const area = check("area", num(input.area, 0.01, 99_999, false));
  const rooms = check("rooms", num(input.rooms, 0, 50, true));
  const half = check("halfRooms", num(input.halfRooms, 0, 50, true));
  const year = check("builtYear", num(input.builtYear, 1500, 2100, true));
  const outdoor = input.outdoor.map((o) => ({
    kind: o.kind,
    area_m2: check(`outdoor.${o.kind}`, num(o.area, 0.01, 9_999, false)),
  }));
  if (Object.keys(problems).length) return { status: "error", fields: problems };
  const listOf = (xs: string[], max: number) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))].slice(0, max);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_property_features", {
    p_property_id: input.propertyId,
    p_area_m2: area as number,
    p_rooms: rooms as number,
    p_half_rooms: half as number,
    p_built_year: year as number,
    p_heating: (input.heating || null) as string,
    p_energy_rating: (input.energy || null) as string,
    p_parking: (input.parking || null) as string,
    p_lift: (input.lift === "" ? null : input.lift === "yes") as boolean,
    p_furnishing: (input.furnishing || null) as string,
    p_outdoor: outdoor,
    p_extras: listOf(input.extras, 50),
    p_account_extras: listOf(input.ownExtras, 50),
    p_new_extras: listOf(input.newExtras, 20).map((x) => x.slice(0, 40)),
  });
  return dbProblem(error);
}

/** Responsible colleague, common charge or the internal note – only the fields sent are changed. */
export async function saveManagement(_prev: SaveState, form: FormData): Promise<SaveState> {
  const v = read(form);
  const patch: {
    responsible_user_id?: string | null;
    common_charge?: number | null;
    note?: string | null;
  } = {};
  if ("responsible" in v) patch.responsible_user_id = v.responsible || null;
  if ("commonCharge" in v) {
    const n = num(v.commonCharge, 0, 99_999_999, true);
    if (typeof n === "string") return { status: "error", fields: { commonCharge: n } };
    patch.common_charge = n;
  }
  if ("note" in v) patch.note = (v.note ?? "").trim().slice(0, 2000) || null;
  const supabase = await createClient();
  return dbProblem(await savePropertyRow(supabase, "property_management", v.propertyId ?? "", patch));
}

/** Archive from the ⋯ menu (the page then returns to the list). */
export async function archiveProperty(propertyId: string, accountId: string): Promise<SaveState> {
  if ((await editableBase(accountId)) === null) return { status: "error", error: "notAllowed" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_property", {
    p_property_id: propertyId,
  });
  return dbProblem(error);
}

export type CopyInput = {
  sourceId: string;
  address: Values;
  label: string;
  ownRef: string;
  features: boolean;
  services: boolean;
  contacts: boolean;
  management: boolean;
  photos: boolean;
};

/**
 * "Másolás új ingatlanként": a new property from this one with its own unit, name and ID; features, services (without
 * identifiers and meters), contacts, ownership and photos as chosen. Then on to the copy.
 */
export async function copyProperty(input: CopyInput): Promise<SaveState> {
  const problems: Partial<Record<string, FieldProblem>> = {};
  for (const key of ["postalCode", "city", "streetName", "streetType", "houseNumber"]) if (!(input.address[key] ?? "").trim()) problems[key] = "required";
  if (!problems.postalCode && !/^\d{4}$/.test(input.address.postalCode!.trim())) problems.postalCode = "postalCode";
  if (Object.keys(problems).length) return { status: "error", fields: problems };
  const supabase = await createClient();
  const { data: source } = await supabase.from("properties").select("id, account_id").eq("id", input.sourceId).maybeSingle();
  const base = source ? await editableBase(source.account_id) : null;
  if (!source || base === null) return { status: "error", error: "notAllowed" };
  const a = addressParts(input.address);
  const { data, error } = await supabase.rpc("copy_property", {
    p_source: source.id,
    p_postal_code: a.postal_code,
    p_city: a.city,
    p_street_name: a.street_name,
    p_street_type: a.street_type,
    p_house_number: a.house_number,
    p_building: a.building ?? undefined,
    p_staircase: a.staircase ?? undefined,
    p_floor_type: a.floor_type ?? undefined,
    p_floor_number: a.floor_number ?? undefined,
    p_door: a.door ?? undefined,
    p_label: text(input.label, 120) ?? undefined,
    p_own_ref: text(input.ownRef, 30) ?? undefined,
    p_features: input.features,
    p_services: input.services,
    p_contacts: input.contacts,
    p_management: input.management,
  });
  const created = data?.[0];
  if (error || !created) return dbProblem(error ?? { message: "no_row" });
  if (input.photos) await copyPhotos(source.id, source.account_id, created.property_id);
  const { host } = await requestOrigin();
  redirect(hrefFor("portal", `${base}/properties/${created.public_code}?created=1`, host));
}

/** Copies the photo files into the new property's folder (best effort: a failed file is skipped). */
async function copyPhotos(fromId: string, accountId: string, toId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { data: media } = await supabase.from("property_media").select("path, is_cover, sort, width, height").eq("property_id", fromId).eq("kind", "photo").order("sort");
  for (const m of media ?? []) {
    const path = `${accountId}/${toId}/${m.path.split("/").pop()}`;
    const { error } = await supabase.storage.from("property-media").copy(m.path, path);
    if (error) continue;
    await supabase
      .from("property_media")
      .insert({ property_id: toId, path, is_cover: m.is_cover, sort: m.sort, width: m.width, height: m.height, created_by: auth?.claims.sub });
  }
}

export type ImportResult =
  { status: "done"; batchId: string; created: number; updated: number } | { status: "error"; error: "generic" | "notAllowed" | "ownRefTaken" };

/** The checked rows in one go (the database checks every value again; one bad row stops the whole import). */
export async function importProperties(accountId: string, fileName: string, rows: Record<string, string | number | null>[]): Promise<ImportResult> {
  if ((await editableBase(accountId)) === null) return { status: "error", error: "notAllowed" };
  if (!rows.length || rows.length > 500) return { status: "error", error: "generic" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_properties", { p_account_id: accountId, p_file_name: fileName.slice(0, 200), p_rows: rows });
  const r = data?.[0];
  if (error || !r) {
    if (error?.code === "23505") return { status: "error", error: "ownRefTaken" };
    if (error?.code === "42501") return { status: "error", error: "notAllowed" };
    console.error("import failed", error?.code, error?.message);
    return { status: "error", error: "generic" };
  }
  return { status: "done", batchId: r.batch_id, created: r.created, updated: r.updated };
}

export async function undoImport(batchId: string): Promise<{ status: "done" } | { status: "error"; error: "generic" | "undoInUse" | "undoLate" }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("undo_import", { p_batch_id: batchId });
  if (!error) return { status: "done" };
  if (error.message === "import_in_use") return { status: "error", error: "undoInUse" };
  if (error.message === "import_not_undoable") return { status: "error", error: "undoLate" };
  return { status: "error", error: "generic" };
}
