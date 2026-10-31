"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { hrefFor } from "@/lib/sites";

export type LoginState = { status: "idle" | "sent" } | { status: "error"; error: "email" | "noAccount" | "generic" };

/** Emails a one-time sign-in link (no password). Used by both app. and admin. */
export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { status: "error", error: "email" };

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const next = String(form.get("next") ?? "/");
  const site = form.get("site") === "admin" ? "admin" : "portal";
  const callback = hrefFor(site, "/auth/callback", host);
  const locale = await getLocale();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${proto}://${host}${callback}?next=${encodeURIComponent(next)}`,
      // The admin surface never creates new accounts on sign-in.
      shouldCreateUser: site === "portal",
      data: { locale: isLocale(locale) ? locale : "hu" },
    },
  });
  if (error) {
    console.error("magic link failed", error.code, error.message);
    const noAccount = error.code === "otp_disabled" || error.code === "signup_disabled";
    return { status: "error", error: noAccount ? "noAccount" : "generic" };
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
