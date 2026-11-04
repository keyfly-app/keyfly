"use server";

import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const MEDIA_BUCKET = "property-media";
const MAX_PHOTOS = 30;
const MAX_BYTES = 1024 * 1024 * 0.95; // the browser sends a resized WEBP below the server action's 1 MB limit
const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export type ListingState = { status: "idle" } | { status: "saved" } | { status: "error"; error?: "generic" | "notAllowed" | "type" | "limit"; fields?: Record<string, string> };

function failed(error: { code?: string; message?: string } | null): ListingState {
  if (!error) return { status: "saved" };
  if (error.code === "42501") return { status: "error", error: "notAllowed" };
  console.error("listing save failed", error.code, error.message);
  return { status: "error", error: "generic" };
}

/** One photo (already resized in the browser) into the private bucket; the first one becomes the cover. */
export async function uploadPhoto(form: FormData): Promise<ListingState> {
  const file = form.get("photo");
  const propertyId = String(form.get("propertyId") ?? "");
  const ext = file instanceof File ? TYPES[file.type] : undefined;
  if (!(file instanceof File) || !ext || file.size === 0 || file.size > MAX_BYTES) return { status: "error", error: "type" };
  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { data: property } = await supabase.from("properties").select("id, account_id, property_media(id, is_cover)").eq("id", propertyId).maybeSingle();
  if (!property || !auth?.claims) return { status: "error", error: "notAllowed" };
  if (property.property_media.length >= MAX_PHOTOS) return { status: "error", error: "limit" };

  const path = `${property.account_id}/${property.id}/${randomBytes(12).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "")}.${ext}`;
  const { error: upload } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (upload) {
    console.error("photo upload failed", upload.message);
    return { status: "error", error: upload.message.includes("row-level security") ? "notAllowed" : "generic" };
  }
  const { error } = await supabase.from("property_media").insert({
    property_id: property.id,
    path,
    is_cover: !property.property_media.some((m) => m.is_cover),
    sort: property.property_media.length,
    width,
    height,
    created_by: auth.claims.sub,
  });
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return failed(error);
  }
  return { status: "saved" };
}

export async function setCover(propertyId: string, mediaId: string): Promise<ListingState> {
  const supabase = await createClient();
  const { error: off } = await supabase.from("property_media").update({ is_cover: false }).eq("property_id", propertyId).eq("is_cover", true);
  if (off) return failed(off);
  const { data, error } = await supabase.from("property_media").update({ is_cover: true }).eq("id", mediaId).eq("property_id", propertyId).select("id");
  return error ? failed(error) : data?.length ? { status: "saved" } : { status: "error", error: "notAllowed" };
}

/** Deletes the photo and its file; when it was the cover, the next photo takes over. */
export async function deletePhoto(propertyId: string, mediaId: string): Promise<ListingState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("property_media").delete().eq("id", mediaId).eq("property_id", propertyId).select("path, is_cover");
  if (error) return failed(error);
  const gone = data?.[0];
  if (!gone) return { status: "error", error: "notAllowed" };
  await supabase.storage.from(MEDIA_BUCKET).remove([gone.path]);
  if (gone.is_cover) {
    const { data: next } = await supabase.from("property_media").select("id").eq("property_id", propertyId).order("sort").limit(1);
    if (next?.[0]) await supabase.from("property_media").update({ is_cover: true }).eq("id", next[0].id);
  }
  return { status: "saved" };
}

export type TermsInput = {
  propertyId: string;
  rent: string;
  currency: "HUF" | "EUR";
  depositMonths: string;
  availableNow: boolean;
  availableFrom: string;
  minTerm: string;
  pets: string;
  smoking: string;
  bills: string;
  parkingPropertyId: string;
  parkingRent: string;
};

function int(raw: string, min: number, max: number): number | null | "amount" | "range" {
  const s = raw.replace(/[\s.]/g, "");
  if (!s) return null;
  if (!/^\d+$/.test(s)) return "amount";
  const n = Number(s);
  return n < min || n > max ? "range" : n;
}

/** "Bérleti feltételek": asking rent and currency, deposit, availability, minimum term, pets, smoking, bills, parking. */
export async function saveTerms(input: TermsInput): Promise<ListingState> {
  const fields: Record<string, string> = {};
  const pick = (k: string, v: ReturnType<typeof int>) => (typeof v === "string" ? ((fields[k] = v), null) : v);
  const rent = pick("rent", int(input.rent, 1, 999_999_999));
  const deposit = pick("depositMonths", int(input.depositMonths, 0, 12));
  const minTerm = pick("minTerm", int(input.minTerm, 1, 120));
  const bills = pick("bills", int(input.bills, 0, 99_999_999));
  const parkingRent = pick("parkingRent", int(input.parkingRent, 0, 99_999_999));
  if (!input.availableNow && !/^\d{4}-\d{2}-\d{2}$/.test(input.availableFrom)) fields.availableFrom = "date";
  if (Object.keys(fields).length) return { status: "error", fields };
  const supabase = await createClient();
  const { error } = await supabase.from("property_listing").upsert(
    {
      property_id: input.propertyId,
      asking_rent: rent,
      currency: input.currency === "EUR" ? "EUR" : "HUF",
      deposit_months: deposit,
      available_now: input.availableNow,
      available_from: input.availableNow ? null : input.availableFrom,
      min_term_months: minTerm,
      pets: input.pets || null,
      smoking: input.smoking || null,
      est_bills: bills,
      parking_property_id: input.parkingPropertyId || null,
      parking_rent: input.parkingPropertyId ? parkingRent : null,
    },
    { onConflict: "property_id" },
  );
  return failed(error);
}

export async function saveAd(propertyId: string, title: string, description: string): Promise<ListingState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("property_listing")
    .upsert({ property_id: propertyId, title: title.trim().replace(/\s+/g, " ").slice(0, 120) || null, description: description.trim().slice(0, 3000) || null }, { onConflict: "property_id" });
  return failed(error);
}

export async function addLink(propertyId: string, label: string, url: string): Promise<ListingState> {
  const fields: Record<string, string> = {};
  const name = label.trim().replace(/\s+/g, " ").slice(0, 60);
  let href = url.trim();
  if (href && !/^https?:\/\//i.test(href)) href = `https://${href}`;
  if (!name) fields.label = "label";
  try {
    const u = new URL(href);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || href.length > 500 || /\s/.test(href)) fields.url = "url";
  } catch {
    fields.url = "url";
  }
  if (Object.keys(fields).length) return { status: "error", fields };
  const supabase = await createClient();
  const { count } = await supabase.from("property_links").select("id", { count: "exact", head: true }).eq("property_id", propertyId);
  const { error } = await supabase.from("property_links").insert({ property_id: propertyId, label: name, url: href, sort: count ?? 0 });
  return failed(error);
}

export async function removeLink(propertyId: string, linkId: string): Promise<ListingState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("property_links").delete().eq("id", linkId).eq("property_id", propertyId).select("id");
  return error ? failed(error) : data?.length ? { status: "saved" } : { status: "error", error: "notAllowed" };
}
