import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";
import { clientIp, secretKey } from "./forwarded";
import { authCookieOptions, REMEMBER_COOKIE, wantsRemember } from "./session-cookies";

async function cookieAdapter(remember: boolean | undefined) {
  const cookieStore = await cookies();
  const persist = remember ?? wantsRemember(cookieStore.get(REMEMBER_COOKIE)?.value);
  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, authCookieOptions(value, options, persist)));
      } catch {
        // Server Components cannot set cookies – the proxy refreshes the session instead.
      }
    },
  };
}

/**
 * Server-side Supabase client acting as the signed-in user (RLS applies).
 * `remember` overrides the saved "keep me signed in" choice (used by the sign-in action itself).
 */
export async function createClient({ remember }: { remember?: boolean } = {}) {
  const { url, key } = supabaseEnv();
  return createServerClient<Database>(url, key, { cookies: await cookieAdapter(remember) });
}

/**
 * Client for Supabase Auth calls only (sign-in, sign-up, password reset, resend, OAuth start and code exchange,
 * verifyOtp, MFA challenge/verify, updateUser, linkIdentity). Auth rate-limits by IP address; our server calls would
 * all count against Vercel's few addresses, so this client forwards the visitor's IP (`sb-forwarded-for`), which
 * Supabase accepts only with the secret key. Same session cookies as createClient.
 * Never use it for .from() or .rpc(): without a session the secret key acts as service_role (RLS bypassed).
 * Without SUPABASE_SECRET_KEY (local) it is the ordinary client.
 */
export async function createAuthClient({ remember }: { remember?: boolean } = {}) {
  const { url, key } = supabaseEnv();
  const secret = secretKey();
  const ip = clientIp(await headers());
  return createServerClient<Database>(url, secret ?? key, {
    cookies: await cookieAdapter(remember),
    ...(secret && ip ? { global: { headers: { "sb-forwarded-for": ip } } } : {}),
  });
}
