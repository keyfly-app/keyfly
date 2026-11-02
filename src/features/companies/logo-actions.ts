"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManage, LOGO_BUCKET, myAccounts } from "./accounts";

export type LogoState = { status: "idle" } | { status: "saved" | "removed" } | { status: "error"; error: "type" | "size" | "generic" };

const TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};
const MAX_BYTES = 1024 * 1024; // the bucket's limit; a 512 × 512 logo is far below it

/** The company the form names, if the signed-in person is its holder or an admin. */
async function managedCompany(form: FormData) {
  const id = String(form.get("account") ?? "");
  const account = (await myAccounts()).find((a) => a.kind === "company" && a.id === id);
  return account && canManage(account) ? account : null;
}

/** Company logo (canvas v2.5 "Céglogó"): the browser sends the fitted 512 × 512 square; the previous file is deleted. */
export async function uploadCompanyLogo(_: LogoState, form: FormData): Promise<LogoState> {
  const logo = form.get("logo");
  const ext = logo instanceof File ? TYPES[logo.type] : undefined;
  if (!(logo instanceof File) || !ext) return { status: "error", error: "type" };
  if (logo.size === 0 || logo.size > MAX_BYTES) return { status: "error", error: "size" };
  const account = await managedCompany(form);
  if (!account) return { status: "error", error: "generic" };

  const supabase = await createClient();
  const path = `${account.id}/${randomBytes(12).toString("base64url")}.${ext}`;
  const { error: upload } = await supabase.storage.from(LOGO_BUCKET).upload(path, logo, { contentType: logo.type, upsert: false });
  if (upload) {
    console.error("logo upload failed", upload.message);
    return { status: "error", error: "generic" };
  }
  const { data: before } = await supabase.from("accounts").select("logo_path").eq("id", account.id).maybeSingle();
  const { error } = await supabase.from("accounts").update({ logo_path: path }).eq("id", account.id);
  if (error) {
    console.error("logo save failed", error.code);
    await supabase.storage.from(LOGO_BUCKET).remove([path]);
    return { status: "error", error: "generic" };
  }
  if (before?.logo_path) await supabase.storage.from(LOGO_BUCKET).remove([before.logo_path]);
  revalidatePath("/", "layout");
  return { status: "saved" };
}

/** Back to the monogram. */
export async function removeCompanyLogo(_: LogoState, form: FormData): Promise<LogoState> {
  const account = await managedCompany(form);
  if (!account) return { status: "error", error: "generic" };
  const supabase = await createClient();
  const { data: before } = await supabase.from("accounts").select("logo_path").eq("id", account.id).maybeSingle();
  const { error } = await supabase.from("accounts").update({ logo_path: null }).eq("id", account.id);
  if (error) return { status: "error", error: "generic" };
  if (before?.logo_path) await supabase.storage.from(LOGO_BUCKET).remove([before.logo_path]);
  revalidatePath("/", "layout");
  return { status: "removed" };
}
