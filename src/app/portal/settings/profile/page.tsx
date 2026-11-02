import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { PersonalAddress } from "@/features/settings/actions";
import { AddressCard } from "@/features/settings/AddressCard";
import { currentUser } from "@/features/settings/current-user";
import { LanguageRow } from "@/features/settings/LanguageRow";
import { PhotoEditor } from "@/features/settings/PhotoEditor";
import { ProfileDetails } from "@/features/settings/ProfileDetails";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { isLocale } from "@/i18n/config";
import { date } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("profile.title"), robots: { index: false } };
}

const address = (v: unknown): PersonalAddress | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as PersonalAddress) : null);

/** Profil: photo; name and phone (each changed in its own dialog); the language of the app and our emails; addresses. */
export default async function ProfileSettings() {
  const [t, user, raw] = await Promise.all([getTranslations("settings"), currentUser(), getLocale()]);
  if (!user) notFound();
  const supabase = await createClient();
  const { data: addr } = await supabase.from("profiles").select("home_address, mailing_address").eq("id", user.id).maybeSingle();
  const locale = isLocale(raw) ? raw : "hu";
  return (
    <>
      <SettingsHeader title={t("profile.title")} lead={t("profile.lead")} />
      <PhotoEditor avatarUrl={user.avatarUrl} initials={user.initials} />
      <ProfileDetails
        title={t("profile.personal")}
        items={["name", "phone"]}
        name={user.fullName}
        email={user.email}
        pendingEmail={user.pendingEmail}
        phone={user.phone}
        passwordChanged={user.passwordChangedAt ? date(user.passwordChangedAt, locale).replace(/ /g, "\u00a0") : null}
        extra={<LanguageRow />}
      />
      <AddressCard home={address(addr?.home_address)} mailing={address(addr?.mailing_address)} />
    </>
  );
}
