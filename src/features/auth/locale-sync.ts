import "server-only";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import type { createClient } from "@/lib/supabase/server";

/**
 * Auth emails (sign-in link, password reset) are written in the language stored on the user.
 * Keep it in step with the language they last used. Best effort: a failure never blocks sign-in.
 */
export async function syncEmailLocale(supabase: Awaited<ReturnType<typeof createClient>>, metadata: Record<string, unknown> | undefined) {
  const current = await getLocale();
  if (!isLocale(current) || metadata?.locale === current) return;
  const { error } = await supabase.auth.updateUser({ data: { locale: current } });
  if (error) console.error("locale sync failed", error.code);
}
