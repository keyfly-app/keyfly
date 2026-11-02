import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { companyBySlug } from "@/features/companies/accounts";
import { companySettingsLinks, personalSettingsLinks } from "@/features/settings/links";
import { SettingsNav } from "@/features/settings/SettingsNav";

/** Company settings: personal items first (same in every account), then this company's. */
export default async function CompanySettingsLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const [t, personal, company] = await Promise.all([getTranslations("settings"), personalSettingsLinks(), companySettingsLinks(slug)]);
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <aside className="hidden w-[232px] flex-none flex-col gap-4 lg:flex">
        <SettingsNav heading={t("nav.personal")} label={t("nav.label")} links={personal} />
        <SettingsNav heading={account.name} label={account.name} links={company} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:max-w-[760px]">{children}</div>
    </div>
  );
}
