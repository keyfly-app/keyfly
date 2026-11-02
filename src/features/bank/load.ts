import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BankAccountRow } from "./BankAccounts";

/** The bank accounts of one Keyfly account (RLS: members and staff read them). */
export async function bankAccountsOf(accountId: string): Promise<BankAccountRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bank_accounts")
    .select("id, currency, iban, holder_name, label, is_primary")
    .eq("account_id", accountId)
    .order("created_at");
  return data ?? [];
}
