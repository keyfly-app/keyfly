import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { personalSettingsLinks } from "@/features/settings/links";
import { SettingsNav } from "@/features/settings/SettingsNav";

/** Settings: the menu on the left from desktop width; on phones /settings itself is the menu. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [t, links] = await Promise.all([getTranslations("settings"), personalSettingsLinks()]);
  return (
    <Shell site="portal">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <aside className="hidden w-[232px] flex-none lg:block">
          <SettingsNav heading={t("nav.personal")} label={t("nav.label")} links={links} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:max-w-[760px]">{children}</div>
      </div>
    </Shell>
  );
}
