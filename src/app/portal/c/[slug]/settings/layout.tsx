import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Shell } from "@/components/Shell";
import { CompanyMark } from "@/components/ui/CompanyMark";
import { accountInitials, companyBySlug } from "@/features/companies/accounts";
import { CompanyTabs } from "@/features/settings/CompanyTabs";
import { companySettingsLinks } from "@/features/settings/links";
import { SettingsFrame } from "@/features/settings/SettingsFrame";
import { siteHref } from "@/lib/site-href";

/** A company's settings: the settings menu in the left column, the company's name and role on top, its pages as tabs. */
export default async function CompanySettingsLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const [t, a, inv, tabs, back] = await Promise.all([
    getTranslations("settings"),
    getTranslations("accounts"),
    getTranslations("invite"),
    companySettingsLinks(slug),
    siteHref("portal", "/settings"),
  ]);
  return (
    <Shell account={account} settings>
      <SettingsFrame>
        <div className="flex flex-col gap-3">
          <Link href={back} className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start px-1 text-[13px] font-medium text-ink lg:hidden">
            <Icon name="back" size={16} />
            {t("back")}
          </Link>
          <div className="flex items-center gap-3.5">
            <CompanyMark logoUrl={account.logoUrl} initials={accountInitials(account.name)} size={44} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <h1 className="truncate font-display text-[22px] leading-7 font-semibold">{account.name}</h1>
              <p className="text-sm text-muted">
                {inv(`roles.${account.role}`)} · {a(`plans.${account.plan}`)}
              </p>
            </div>
          </div>
        </div>
        <CompanyTabs label={t("companyTabs", { name: account.name })} tabs={tabs} />
        {children}
      </SettingsFrame>
    </Shell>
  );
}
