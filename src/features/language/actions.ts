"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { localeCookie } from "@/lib/locale-cookie";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Language switch on the app and admin: remembers the choice on this device and, when signed in,
 * on the profile too – so emails about this person (and auth emails) follow it. Then back to the same page.
 */
export async function switchLanguage(form: FormData) {
  const locale = form.get("locale");
  const back = safeNext(form.get("back"));
  if (!isLocale(locale)) redirect(back);

  const cookie = localeCookie(locale, (await headers()).get("host"));
  (await cookies()).set(cookie);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (auth?.claims) {
    // Best effort: a failed save never blocks the switch itself.
    const [{ error: profileError }, { error: userError }] = await Promise.all([
      supabase.from("profiles").update({ locale }).eq("id", auth.claims.sub),
      supabase.auth.updateUser({ data: { locale } }),
    ]);
    if (profileError || userError) console.error("language save failed", profileError?.code ?? userError?.code);
  }
  redirect(back);
}
