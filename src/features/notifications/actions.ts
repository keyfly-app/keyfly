"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTopic } from "./prefs";

/** One switch on Értesítések: saved at once into profiles.email_prefs (only the person's own row is writable). */
export async function setEmailTopic(topic: string, on: boolean): Promise<boolean> {
  if (!isTopic(topic)) return false;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return false;
  const { data: profile } = await supabase.from("profiles").select("email_prefs").eq("id", auth.claims.sub).single();
  const prefs = profile?.email_prefs && typeof profile.email_prefs === "object" && !Array.isArray(profile.email_prefs) ? profile.email_prefs : {};
  const { error } = await supabase.from("profiles").update({ email_prefs: { ...prefs, [topic]: on } }).eq("id", auth.claims.sub);
  if (error) {
    console.error("email preference failed", error.code);
    return false;
  }
  revalidatePath("/settings/notifications");
  return true;
}
