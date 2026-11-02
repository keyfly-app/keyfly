import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { accountInitials, companyBySlug } from "@/features/companies/accounts";
import { companySettingsLinks, personalSettingsLinks } from "@/features/settings/links";
import { SettingsNav } from "@/features/settings/SettingsNav";

/** Company settings: this company's items first (with your role in it), then your personal ones. */
export default async function CompanySettingsLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const [t, inv, personal, company] = await Promise.all([getTranslations("settings"), getTranslations("invite"), personalSettingsLinks(), companySettingsLinks(slug)]);
  const heading = { initials: accountInitials(account.name), role: inv(`roles.${account.role}`) };
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <aside className="hidden w-[232px] flex-none flex-col gap-4 lg:flex">
        <SettingsNav heading={account.name} label={account.name} links={company} company={heading} />
        <span aria-hidden="true" className="mx-2.5 h-px bg-line" />
        <SettingsNav heading={t("nav.personal")} label={t("nav.label")} links={personal} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:max-w-[760px]">{children}</div>
    </div>
  );
}
