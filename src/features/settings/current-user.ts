import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  /** Address waiting for confirmation after an email change. */
  pendingEmail: string | null;
  fullName: string | null;
  phone: string | null;
  initials: string;
  /** Short-lived signed link to the profile photo (private bucket). */
  avatarUrl: string | null;
  avatarPath: string | null;
  passwordChangedAt: string | null;
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
    .select("full_name, phone, avatar_path, password_changed_at")
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
    initials: initialsOf(profile?.full_name ?? null, user.email),
    avatarUrl: signed?.signedUrl ?? null,
    avatarPath,
    passwordChangedAt: profile?.password_changed_at ?? null,
  };
});
