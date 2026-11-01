import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { currentUser } from "@/features/settings/current-user";
import { PhotoEditor } from "@/features/settings/PhotoEditor";
import { ProfileDetails } from "@/features/settings/ProfileDetails";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { isLocale } from "@/i18n/config";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("profile.title"), robots: { index: false } };
}

/** Profil és belépés: photo, then name, email, password and phone – each changed in its own dialog. */
export default async function ProfileSettings() {
  const [t, user, raw] = await Promise.all([getTranslations("settings"), currentUser(), getLocale()]);
  if (!user) notFound();
  const locale = isLocale(raw) ? raw : "hu";
  return (
    <>
      <SettingsHeader title={t("profile.title")} lead={t("profile.lead")} />
      <PhotoEditor avatarUrl={user.avatarUrl} initials={user.initials} />
      <ProfileDetails
        name={user.fullName}
        email={user.email}
        pendingEmail={user.pendingEmail}
        phone={user.phone}
        passwordChanged={user.passwordChangedAt ? date(user.passwordChangedAt, locale) : null}
      />
    </>
  );
}
