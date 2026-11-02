import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Server-only client with the project's secret key (service_role: bypasses RLS). Used for the few steps a user must
 * not do themselves: creating a company after the NAV check, finding who to notify about an access request.
 * Null when SUPABASE_SECRET_KEY is not configured – callers degrade (no email) or refuse (no company creation).
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return null;
  // A publishable (public) key here would run as an anonymous user and every call would be refused.
  if (!secret.startsWith("sb_secret_")) {
    console.error("SUPABASE_SECRET_KEY is not a secret key (expected sb_secret_…)");
    return null;
  }
  return createClient<Database>(supabaseEnv().url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
