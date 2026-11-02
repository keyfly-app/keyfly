"use server";

import { revalidatePath } from "next/cache";
import { parseAccount } from "@/lib/bank-account";
import { createClient } from "@/lib/supabase/server";

export type BankState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; fields?: Partial<Record<"number" | "holder" | "currency", "empty" | "format" | "checksum" | "duplicate">>; error?: "notAllowed" | "generic" };

/** Adds or changes a bank account (canvas "Bankszámla hozzáadása"). The number is checked again here and stored as IBAN. */
export async function saveBankAccount(_: BankState, form: FormData): Promise<BankState> {
  const id = String(form.get("id") ?? "");
  const accountId = String(form.get("accountId") ?? "");
  const currency = String(form.get("currency") ?? "").toUpperCase();
  const holder = String(form.get("holder") ?? "").replace(/\s+/g, " ").trim();
  const label = String(form.get("label") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const parsed = parseAccount(String(form.get("number") ?? ""));
  const fields: NonNullable<Extract<BankState, { status: "error" }>["fields"]> = {};
  if (!parsed.ok) fields.number = parsed.error;
  if (!holder || holder.length > 200) fields.holder = "empty";
  if (!/^[A-Z]{3}$/.test(currency)) fields.currency = "format";
  if (Object.keys(fields).length || !parsed.ok) return { status: "error", fields };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { status: "error", error: "notAllowed" };
  const row = { currency, iban: parsed.iban, holder_name: holder, label: label || null, is_primary: form.get("primary") === "on" };
  const { error, count } = id
    ? await supabase.from("bank_accounts").update(row, { count: "exact" }).eq("id", id)
    : await supabase.from("bank_accounts").insert({ ...row, account_id: accountId, created_by: String(auth.claims.sub) }, { count: "exact" });
  if (error?.code === "23505") return { status: "error", fields: { number: "duplicate" } };
  if (error || !count) {
    if (error) console.error("bank account failed", error.code);
    return { status: "error", error: error?.code === "42501" || !count ? "notAllowed" : "generic" };
  }
  revalidatePath("/", "layout");
  return { status: "saved" };
}

export async function makePrimary(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("bank_accounts").update({ is_primary: true }, { count: "exact" }).eq("id", id);
  if (!error && count) revalidatePath("/", "layout");
  return { ok: !error && Boolean(count) };
}

export async function deleteBankAccount(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("bank_accounts").delete({ count: "exact" }).eq("id", id);
  if (!error && count) revalidatePath("/", "layout");
  return { ok: !error && Boolean(count) };
}
