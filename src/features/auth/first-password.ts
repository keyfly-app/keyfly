import "server-only";
import { isValidPassword } from "@/features/auth/password";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Does this person sign in with a password (an "email" sign-in method)? Accounts made with Google have none at first. */
export async function hasPassword(supabase: Client): Promise<boolean> {
  const { data } = await supabase.auth.getUserIdentities();
  return Boolean(data?.identities.some((i) => i.provider === "email"));
}

/**
 * A first password for an account made with Google: then the email sign-in method is recorded (server only), so the
 * Google account can be unlinked later. Returns an error key or null.
 */
export async function setFirstPassword(supabase: Client, id: string, password: string): Promise<string | null> {
  if (!isValidPassword(password)) return "weakPassword";
  const admin = createAdminClient();
  if (!admin) return "generic";
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "weak_password") return "weakPassword";
    console.error("first password failed", error.code);
    return "generic";
  }
  const { data: added, error: identityError } = await admin.rpc("add_email_identity", { p_user: id });
  if (identityError || !added) {
    console.error("email identity failed", identityError?.code);
    return "generic";
  }
  await supabase.auth.refreshSession();
  return null;
}

