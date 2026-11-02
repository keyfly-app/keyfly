import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/** Has this person accepted the general terms? (Everyone who signed up with the form has; Google sign-ups do it on /register/google.) */
export async function hasAcceptedTerms(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const { data } = await supabase.from("consents").select("id").eq("user_id", userId).eq("kind", "terms").limit(1);
  return Boolean(data?.length);
}

/** An account Google created a moment ago (only a Google sign-in method), before the terms were accepted. */
export function isFreshGoogleAccount(user: User): boolean {
  const providers = (user.identities ?? []).map((i) => i.provider);
  return providers.length > 0 && providers.every((p) => p === "google") && Date.now() - new Date(user.created_at).getTime() < 30 * 60 * 1000;
}

/**
 * Removes an account that Google created but whose terms were never accepted: nobody uses it yet. Only for such
 * accounts – the caller checks the consents first.
 */
export async function removeUnfinishedAccount(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) console.error("unfinished account delete failed", error.code);
  return !error;
}
