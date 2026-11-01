"use server";

import { randomBytes } from "node:crypto";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { isValidPassword } from "@/features/auth/password";
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
