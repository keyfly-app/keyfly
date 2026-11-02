"use server";

import { randomBytes } from "node:crypto";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { BRAND } from "@/config/company";
import { isCountry } from "@/config/countries";
import { publicHref } from "@/i18n/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPassword } from "@/features/auth/password";
import { forgetTrustedDevices } from "@/features/security/trusted";
import { requestOrigin } from "@/lib/request-origin";
import { hrefFor } from "@/lib/sites";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Result of a settings form. `error` and `saved` are message keys under settings.errors / settings.saved. */
export type SettingsState =
  | { status: "idle" }
  | { status: "saved"; saved: string; email?: string }
  | { status: "error"; error: string; field?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9][0-9 ]{6,19}$/;
const PHOTO_MAX_BYTES = 1024 * 1024;

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  const email = typeof data?.claims.email === "string" ? data.claims.email : null;
  return { supabase, id: id ? String(id) : null, email };
}

function done(saved: string, extra: { email?: string } = {}): SettingsState {
  revalidatePath("/", "layout");
  return { status: "saved", saved, ...extra };
}

/**
 * Checks the current password without touching the browser's session: a separate, cookie-less client signs in
 * and immediately ends that one session again.
 */
async function passwordMatches(email: string, password: string): Promise<"ok" | "wrong" | "rate"> {
  const { url, key } = supabaseEnv();
  const probe = createPlainClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  if (error) return error.code === "over_request_rate_limit" ? "rate" : "wrong";
  await probe.auth.signOut({ scope: "local" });
  return "ok";
}

export async function updateName(_: SettingsState, form: FormData): Promise<SettingsState> {
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 200) return { status: "error", error: "name", field: "name" };
  const { supabase, id } = await signedIn();
  if (!id) return { status: "error", error: "generic" };
  const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", id);
  if (error) return { status: "error", error: "generic" };
  return done("name");
}

export async function updatePhone(_: SettingsState, form: FormData): Promise<SettingsState> {
  const remove = form.get("intent") === "remove";
  const phone = remove ? null : String(form.get("phone") ?? "").replace(/\s+/g, " ").trim();
  if (phone !== null && !PHONE.test(phone)) return { status: "error", error: "phone", field: "phone" };
  const { supabase, id } = await signedIn();
  if (!id) return { status: "error", error: "generic" };
  const { error } = await supabase.from("profiles").update({ phone }).eq("id", id);
  if (error) return { status: "error", error: "generic" };
  return done(remove ? "phoneRemoved" : "phone");
}

/** Email change: password first, then Supabase sends the confirmation link (template "email_change"). */
export async function changeEmail(_: SettingsState, form: FormData): Promise<SettingsState> {
  const next = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!EMAIL.test(next) || next.length > 254) return { status: "error", error: "email", field: "email" };
  const { supabase, id, email } = await signedIn();
  if (!id || !email) return { status: "error", error: "generic" };
  if (next === email.toLowerCase()) return { status: "error", error: "sameEmail", field: "email" };
  const check = await passwordMatches(email, password);
  if (check !== "ok") return { status: "error", error: check === "rate" ? "rate" : "wrongPassword", field: check === "rate" ? undefined : "password" };

  const { origin, host } = await requestOrigin();
  const emailRedirectTo = `${origin}${hrefFor("portal", "/auth/confirm", host)}?next=${encodeURIComponent("/settings/profile")}`;
  const { error } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo });
  if (error) {
    if (error.code === "email_exists") return { status: "error", error: "emailTaken", field: "email" };
    if (error.code?.startsWith("over_")) return { status: "error", error: "rate" };
    console.error("email change failed", error.code);
    return { status: "error", error: "generic" };
  }
  return done("email", { email: next });
}

/** Password change: current password first; afterwards every other session is signed out. */
export async function changePassword(_: SettingsState, form: FormData): Promise<SettingsState> {
  const current = String(form.get("currentPassword") ?? "");
  const password = String(form.get("password") ?? "");
  if (!isValidPassword(password)) return { status: "error", error: "weakPassword", field: "password" };
  if (password === current) return { status: "error", error: "samePassword", field: "password" };
  const { supabase, id, email } = await signedIn();
  if (!id || !email) return { status: "error", error: "generic" };
  const check = await passwordMatches(email, current);
  if (check !== "ok") return { status: "error", error: check === "rate" ? "rate" : "wrongPassword", field: check === "rate" ? undefined : "currentPassword" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { status: "error", error: "samePassword", field: "password" };
    if (error.code === "weak_password") return { status: "error", error: "weakPassword", field: "password" };
    console.error("password change failed", error.code);
    return { status: "error", error: "generic" };
  }
  await supabase.auth.signOut({ scope: "others" });
  await forgetTrustedDevices(supabase);
  return done("password");
}

const PHOTO_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg" };

/** Profile photo: the browser sends the cropped 512 × 512 image (WebP, or JPEG from Safari); the previous file is deleted. */
export async function uploadPhoto(_: SettingsState, form: FormData): Promise<SettingsState> {
  const photo = form.get("photo");
  const ext = photo instanceof File ? PHOTO_TYPES[photo.type] : undefined;
  if (!(photo instanceof File) || !ext) return { status: "error", error: "photoType" };
  if (photo.size === 0 || photo.size > PHOTO_MAX_BYTES) return { status: "error", error: "photoSize" };
  const { supabase, id } = await signedIn();
  if (!id) return { status: "error", error: "generic" };

  const path = `${id}/${randomBytes(12).toString("base64url")}.${ext}`;
  const { error: upload } = await supabase.storage.from("avatars").upload(path, photo, { contentType: photo.type, upsert: false });
  if (upload) {
    console.error("photo upload failed", upload.message);
    return { status: "error", error: "generic" };
  }
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", id);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    return { status: "error", error: "generic" };
  }
  if (before?.avatar_path) await supabase.storage.from("avatars").remove([before.avatar_path]);
  return done("photo");
}

export async function removePhoto(): Promise<SettingsState> {
  const { supabase, id } = await signedIn();
  if (!id) return { status: "error", error: "generic" };
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", id);
  if (error) return { status: "error", error: "generic" };
  if (before?.avatar_path) await supabase.storage.from("avatars").remove([before.avatar_path]);
  return done("photoRemoved");
}

/** Devices: end one other session, or every other one. */
export async function endSession(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { supabase, id } = await signedIn();
  if (!id) return { status: "error", error: "generic" };
  if (form.get("intent") === "others") {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) return { status: "error", error: "generic" };
    return done("sessions");
  }
  const session = String(form.get("session") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(session)) return { status: "error", error: "generic" };
  const { error } = await supabase.rpc("end_my_session", { p_session_id: session });
  if (error) return { status: "error", error: "generic" };
  return done("session");
}

export type DeleteState = { status: "idle" } | { status: "error"; error: "password" | "code" | "blocked" | "rate" | "setup" | "generic" };

/**
 * Adataid → Fiók törlése: the password (and the two-step code, when on) once more; nothing may block it
 * (account holder of a team, insurance records, staff). Companies only this person works in go with the account;
 * then the sign-in itself – the profile, personal account and backup codes follow by cascade.
 */
export async function deleteAccount(_: DeleteState, form: FormData): Promise<DeleteState> {
  const { supabase, id, email } = await signedIn();
  if (!id || !email) return { status: "error", error: "generic" };
  const check = await passwordMatches(email, String(form.get("password") ?? ""));
  if (check !== "ok") return { status: "error", error: check === "rate" ? "rate" : "password" };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (factor) {
    const code = String(form.get("code") ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) return { status: "error", error: "code" };
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) return { status: "error", error: "code" };
  }
  const { data: blockers } = await supabase.rpc("account_deletion_blockers");
  if (blockers?.length) return { status: "error", error: "blocked" };

  const admin = createAdminClient();
  if (!admin) return { status: "error", error: "setup" };
  const { data: mine } = await admin.from("account_members").select("account_id, accounts!inner(kind)").eq("user_id", id).eq("accounts.kind", "company");
  for (const m of mine ?? []) {
    const { count } = await admin.from("account_members").select("user_id", { count: "exact", head: true }).eq("account_id", m.account_id);
    if (count === 1) {
      const { error } = await admin.from("accounts").delete().eq("id", m.account_id);
      if (error) {
        console.error("account delete: company", error.code);
        return { status: "error", error: "generic" };
      }
    }
  }
  const { data: profile } = await admin.from("profiles").select("avatar_path").eq("id", id).maybeSingle();
  if (profile?.avatar_path) await admin.storage.from("avatars").remove([profile.avatar_path]);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    console.error("account delete failed", error.code);
    return { status: "error", error: "generic" };
  }
  await supabase.auth.signOut({ scope: "local" });
  redirect(`${BRAND.url}${publicHref("home", (await getLocale()) === "en" ? "en" : "hu")}`);
}

// ---------- Addresses (canvas "Profil – lakcím és levelezési cím") ----------

export type PersonalAddress = { country: string; postal_code: string; city: string; street: string; unit?: string };
export type AddressState = { status: "idle" } | { status: "saved"; removed?: boolean } | { status: "error"; fields?: Partial<Record<"postal_code" | "city" | "street", "required" | "postalCode">> };

/** Saves the home or the mailing address; the mailing address may also be "same as home" (null) or removed. */
export async function saveAddress(_: AddressState, form: FormData): Promise<AddressState> {
  const kind = form.get("kind") === "mailing" ? "mailing_address" : "home_address";
  const intent = String(form.get("intent") ?? "save");
  const { supabase, id } = await signedIn();
  if (!id) return { status: "error" };
  let value: PersonalAddress | null = null;
  if (intent === "save" && !(kind === "mailing_address" && form.get("sameAsHome") === "on")) {
    const clean = (k: string) => String(form.get(k) ?? "").replace(/\s+/g, " ").trim();
    const country = clean("country");
    const address: PersonalAddress = { country: isCountry(country) ? country : "HU", postal_code: clean("postal_code").toUpperCase(), city: clean("city"), street: clean("street") };
    const unit = clean("unit").slice(0, 50);
    if (unit) address.unit = unit;
    const fields: NonNullable<Extract<AddressState, { status: "error" }>["fields"]> = {};
    if (!address.postal_code) fields.postal_code = "required";
    else if (address.country === "HU" ? !/^\d{4}$/.test(address.postal_code) : address.postal_code.length > 10) fields.postal_code = "postalCode";
    if (!address.city || address.city.length > 100) fields.city = "required";
    if (!address.street || address.street.length > 200) fields.street = "required";
    if (Object.keys(fields).length) return { status: "error", fields };
    value = address;
  }
  const { error } = await supabase
    .from("profiles")
    .update(kind === "home_address" ? { home_address: value } : { mailing_address: value })
    .eq("id", id);
  if (error) {
    console.error("address failed", error.code);
    return { status: "error" };
  }
  revalidatePath("/", "layout");
  return { status: "saved", removed: intent === "remove" };
}
