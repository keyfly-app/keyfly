import "server-only";
import { cache } from "react";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type AccountSummary = {
  id: string;
  kind: Enums<"account_kind">;
  name: string;
  slug: string | null;
  plan: Enums<"account_plan">;
  role: Enums<"account_role">;
};

/** Every account the signed-in user works in: the personal one first, then companies by name. Once per request. */
export const myAccounts = cache(async (): Promise<AccountSummary[]> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return [];
  const { data } = await supabase
    .from("account_members")
    .select("role, accounts!inner(id, kind, name, slug, plan, archived_at)")
    .eq("user_id", auth.claims.sub)
    .is("accounts.archived_at", null);
  return (data ?? [])
    .map((m) => ({ id: m.accounts.id, kind: m.accounts.kind, name: m.accounts.name, slug: m.accounts.slug, plan: m.accounts.plan, role: m.role }))
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, "hu") : a.kind === "person" ? -1 : 1));
});

/** The company account behind /c/<slug>, if the user is a member. */
export async function companyBySlug(slug: string): Promise<AccountSummary | null> {
  return (await myAccounts()).find((a) => a.kind === "company" && a.slug === slug) ?? null;
}

export const canManage = (a: Pick<AccountSummary, "role">) => a.role === "owner" || a.role === "admin";

/** "Duna Lakáskezelő" → "DL"; "Horváth és Partner Bt." → "HP" (joining words are skipped). */
export function accountInitials(name: string): string {
  return name
    .replace(/\b(kft|bt|zrt|nyrt|kkt|ev)\.?$/i, "")
    .split(/\s+/)
    .filter((w) => w && !/^(és|and|&|a|az|the)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("hu"))
    .join("");
}
