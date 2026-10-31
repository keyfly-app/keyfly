"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hrefFor } from "@/lib/sites";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

/** Belépési link küldése e-mailben (jelszó nélkül). Az app. és az admin. felület is ezt használja. */
export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: "error", message: "Adj meg egy érvényes e-mail címet." };
  }
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.includes(".localhost") ? "http" : "https");
  const next = String(form.get("next") ?? "/");
  const site = form.get("site") === "admin" ? "admin" : "portal";
  const callback = hrefFor(site, "/auth/callback", host);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${proto}://${host}${callback}?next=${encodeURIComponent(next)}`,
      // Admin felületen nem hozunk létre új fiókot belépéskor.
      shouldCreateUser: form.get("allowSignup") === "1",
    },
  });
  if (error) {
    console.error("magic link failed", error.code, error.message);
    return {
      status: "error",
      message:
        error.code === "otp_disabled" || error.code === "signup_disabled"
          ? "Ehhez az e-mail címhez nem tartozik fiók."
          : "Nem sikerült elküldeni a belépési linket. Próbáld újra kicsit később.",
    };
  }
  return { status: "sent" };
}

export async function signOut(form: FormData) {
  const site = form.get("site") === "admin" ? "admin" : "portal";
  const supabase = await createClient();
  await supabase.auth.signOut();
  const h = await headers();
  redirect(hrefFor(site, "/login", h.get("host")));
}
