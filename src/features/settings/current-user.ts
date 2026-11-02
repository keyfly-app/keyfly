import "server-only";
import { cache } from "react";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  /** Address waiting for confirmation after an email change. */
  pendingEmail: string | null;
  fullName: string | null;
  /** E.164; set only through the SMS check. */
  phone: string | null;
  phoneVerifiedAt: string | null;
  initials: string;
  /** Short-lived signed link to the profile photo (private bucket). */
  avatarUrl: string | null;
  avatarPath: string | null;
  passwordChangedAt: string | null;
  /** Sign-in methods ("email" = password, "google"). */
  providers: string[];
  /** Two-step verification: may ask for a sign-in code by email. */
  twoStepEmail: boolean;
  /** What Overview shows ("Nézet"); null until the first-use question is answered. */
  startView: Enums<"start_view"> | null;
};

/** "Kovács Anna" → "KA"; falls back to the email's first letters. */
export function initialsOf(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toLocaleUpperCase())
    .join("");
}

/** The signed-in person, once per request (header, settings pages). */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, phone_verified_at, avatar_path, password_changed_at, start_view, two_step_email")
    .eq("id", user.id)
    .maybeSingle();
  const avatarPath = profile?.avatar_path ?? null;
  const { data: signed } = avatarPath ? await supabase.storage.from("avatars").createSignedUrl(avatarPath, 60 * 60) : { data: null };
  return {
    id: user.id,
    email: user.email,
    pendingEmail: user.new_email ?? null,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    phoneVerifiedAt: profile?.phone_verified_at ?? null,
    initials: initialsOf(profile?.full_name ?? null, user.email),
    avatarUrl: signed?.signedUrl ?? null,
    avatarPath,
    passwordChangedAt: profile?.password_changed_at ?? null,
    providers: (user.identities ?? []).map((i) => i.provider),
    twoStepEmail: profile?.two_step_email ?? true,
    startView: profile?.start_view ?? null,
  };
});
