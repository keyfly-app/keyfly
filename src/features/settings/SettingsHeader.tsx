import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { siteHref } from "@/lib/site-href";

/**
 * Page title of a settings page, with the way back to the Summary on phones. Inside a company's tabs (`tab`) the
 * company's name is the page title, so this is a section heading without the way back.
 */
export async function SettingsHeader({ title, lead, action, tab = false }: { title: string; lead: string; action?: React.ReactNode; tab?: boolean }) {
  const t = await getTranslations("settings");
  const heading = tab ? <h2 className="text-[17px] leading-6 font-semibold">{title}</h2> : <h1 className="font-display text-[22px] leading-7 font-semibold">{title}</h1>;
  return (
    <div className="flex flex-col gap-3">
      {!tab && (
        <Link href={await siteHref("portal", "/settings")} className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start px-1 text-[13px] font-medium text-ink lg:hidden">
          <Icon name="back" size={16} />
          {t("back")}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          {heading}
          <p className="text-sm text-muted">{lead}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
