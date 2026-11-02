import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { companyBySlug } from "@/features/companies/accounts";
import { companySettingsLinks, personalSettingsLinks } from "@/features/settings/links";
import { SettingsNav } from "@/features/settings/SettingsNav";

/** On phones the settings list itself; on desktop the sidebar does this job. */
export default async function CompanySettingsIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const [t, personal, company] = await Promise.all([getTranslations("settings"), personalSettingsLinks(), companySettingsLinks(slug)]);
  return (
    <>
      <h1 className="font-display text-[22px] leading-7 font-semibold">{t("title")}</h1>
      <SettingsNav variant="list" heading={account.name} label={account.name} links={company} />
      <SettingsNav variant="list" heading={t("nav.personal")} label={t("nav.label")} links={personal} />
    </>
  );
}
