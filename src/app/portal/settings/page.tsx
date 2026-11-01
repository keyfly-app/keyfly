import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/Avatar";
import { currentUser } from "@/features/settings/current-user";
import { personalSettingsLinks } from "@/features/settings/links";
import { SettingsNav } from "@/features/settings/SettingsNav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title"), robots: { index: false } };
}

/** Settings start page: who you are and the settings list (the menu on phones). */
export default async function SettingsIndex() {
  const [t, user, links] = await Promise.all([getTranslations("settings"), currentUser(), personalSettingsLinks()]);
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[22px] leading-7 font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("index.lead")}</p>
      </div>
      {user && (
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4">
          <Avatar src={user.avatarUrl} initials={user.initials} size={48} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-base font-semibold">{user.fullName ?? user.email}</span>
            <span className="truncate text-[13px] text-muted">{user.email}</span>
          </div>
        </div>
      )}
      <SettingsNav variant="list" heading={t("nav.personal")} label={t("nav.label")} links={links} />
    </>
  );
}
