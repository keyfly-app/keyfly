"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setFirstPassword } from "@/features/auth/first-password";
import { requestOrigin } from "@/lib/request-origin";
import { hrefFor } from "@/lib/sites";
import { createClient } from "@/lib/supabase/server";

export type GoogleState = { status: "idle" } | { status: "done" } | { status: "error"; error: "single" | "weakPassword" | "generic" };

/** "Összekapcsolás": off to Google; back on the security page through /auth/callback (canvas v2.4 "Kapcsolt fiókok"). */
export async function linkGoogle() {
  const { origin, host } = await requestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: `${origin}${hrefFor("portal", "/auth/callback", host)}?next=${encodeURIComponent("/settings/security?google=linked")}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    console.error("google link failed", error?.code);
    redirect(hrefFor("portal", "/settings/security?google=error", host));
  }
  redirect(data.url);
}

/**
 * "Leválasztás": only while another way to sign in remains. Someone who signed up with Google sets a password in the
 * same step (form field "password"); the Keyfly email address does not change.
 */
export async function unlinkGoogle(_: GoogleState, form: FormData): Promise<GoogleState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { data } = await supabase.auth.getUserIdentities();
  const identities = data?.identities ?? [];
  const google = identities.find((i) => i.provider === "google");
  if (!auth?.claims || !google) return { status: "error", error: "generic" };
  if (!identities.some((i) => i.provider === "email")) {
    const password = form.get("password");
    if (typeof password !== "string") return { status: "error", error: "single" };
    const failed = await setFirstPassword(supabase, String(auth.claims.sub), password);
    if (failed) return { status: "error", error: failed === "weakPassword" ? "weakPassword" : "generic" };
  }
  const { error } = await supabase.auth.unlinkIdentity(google);
  if (error) {
    console.error("google unlink failed", error.code);
    return { status: "error", error: "generic" };
  }
  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");
  return { status: "done" };
}
