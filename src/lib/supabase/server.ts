import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";
import { authCookieOptions, REMEMBER_COOKIE, wantsRemember } from "./session-cookies";

/**
 * Server-side Supabase client acting as the signed-in user (RLS applies).
 * `remember` overrides the saved "keep me signed in" choice (used by the sign-in action itself).
 */
export async function createClient({ remember }: { remember?: boolean } = {}) {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  const persist = remember ?? wantsRemember(cookieStore.get(REMEMBER_COOKIE)?.value);

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, authCookieOptions(value, options, persist)));
        } catch {
          // Server Components cannot set cookies – the proxy refreshes the session instead.
        }
      },
    },
  });
}
