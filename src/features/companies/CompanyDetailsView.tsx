import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/ui/Tag";
import type { Locale } from "@/i18n/config";
import { date } from "@/lib/format";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { CompanyNameForm } from "./CompanyNameForm";

export type CompanyDetails = { name: string; legal_name: string | null; tax_number: string | null; registered_address: string | null; nav_verified_at: string | null };

/** Cégadatok: the display name (owner/admin can change it) and the NAV data the account was created with (locked). */
export async function CompanyDetailsView({
  accountId,
  manage,
  locale,
  backHref,
  company,
  owner,
}: {
  accountId: string;
  manage: boolean;
  locale: Locale;
  backHref: string;
  company: CompanyDetails;
  owner: { name: string | null; email: string } | null;
}) {
  const [t, c] = await Promise.all([getTranslations("companies.details"), getTranslations("companies")]);
  const nav: [string, string][] = [
    [c("nav.legalName"), company.legal_name ?? "–"],
    [c("nav.taxNumber"), company.tax_number ?? "–"],
    [c("nav.address"), company.registered_address ?? "–"],
  ];

  return (
    <>
      <SettingsHeader title={t("title")} lead={t("lead")} backHref={backHref} />

      <section aria-labelledby="company-name" className="rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-1 sm:px-6">
          <h2 id="company-name" className="text-[15px] font-semibold">
            {t("card")}
          </h2>
          {company.nav_verified_at && (
            <Tag tone="ok">
              <Icon name="check" size={12} strokeWidth={2.5} className="mr-1" />
              {t("verified")}
            </Tag>
          )}
        </div>
        <div className="px-5 pt-3 pb-5 sm:px-6">
          <CompanyNameForm accountId={accountId} name={company.name} editable={manage} />
        </div>
        <dl className="border-t border-line">
          {nav.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 border-b border-line px-5 py-3.5 last:border-b-0 sm:flex-row sm:gap-4 sm:px-6">
              <dt className="flex flex-none items-center gap-1.5 text-[13px] text-muted sm:w-[180px]">
                <Icon name="lock" size={13} />
                {label}
              </dt>
              <dd className="min-w-0 text-sm font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-line bg-paper/60 px-5 py-3 text-[12.5px] leading-[18px] text-muted sm:px-6">
          {company.nav_verified_at ? t("navNote", { date: date(company.nav_verified_at, locale) }) : t("navNoteManual")}
        </p>
      </section>

      {owner && (
        <section aria-labelledby="company-owner" className="rounded-xl border border-line bg-surface px-5 py-5 sm:px-6">
          <h2 id="company-owner" className="text-[15px] font-semibold">
            {t("owner")}
          </h2>
          <p className="mt-2 text-sm font-medium">{owner.name ?? owner.email}</p>
          {owner.name && <p className="text-[13px] text-muted">{owner.email}</p>}
          <p className="mt-2 text-[12.5px] leading-[18px] text-muted">{t("ownerText")}</p>
        </section>
      )}

      {!manage && <p className="text-[13px] text-muted">{t("readOnly")}</p>}
    </>
  );
}
