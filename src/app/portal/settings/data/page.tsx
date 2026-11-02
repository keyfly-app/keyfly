import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { CONTACT } from "@/config/company";
import { DeleteAccount } from "@/features/settings/DeleteAccount";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.data");
  return { title: t("title"), robots: { index: false } };
}

/** Adataid (canvas): download everything in one file; delete the account – unless something must happen first. */
export default async function DataSettings() {
  const [t, supabase] = await Promise.all([getTranslations("settings.data"), createClient()]);
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) notFound();
  const [{ data: blockers }, { data: factors }, exportHref] = await Promise.all([
    supabase.rpc("account_deletion_blockers"),
    supabase.auth.mfa.listFactors(),
    siteHref("portal", "/settings/data/export"),
  ]);
  const holderOf = (blockers ?? []).filter((b) => b.kind === "holder").map((b) => b.name);
  const insurance = blockers?.some((b) => b.kind === "insurance");
  const staff = blockers?.some((b) => b.kind === "staff");
  const records = blockers?.some((b) => b.kind === "records");

  return (
    <>
      <SettingsHeader title={t("title")} lead={t("lead")} />
      <section aria-labelledby="data-export" className="rounded-xl border border-line bg-surface">
        <h2 id="data-export" className="px-5 pt-5 pb-3 text-[15px] font-semibold sm:px-6">
          {t("exportTitle")}
        </h2>
        <div className="flex flex-col gap-4 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <p className="flex-1 text-sm text-ink-soft">{t("exportText")}</p>
          <a href={exportHref} download className="inline-flex h-11 flex-none items-center justify-center gap-2 rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink sm:h-10">
            <Icon name="download" size={16} />
            {t("export")}
          </a>
        </div>
      </section>

      <section aria-labelledby="data-delete" className="rounded-xl border border-line bg-surface">
        <h2 id="data-delete" className="px-5 pt-5 pb-3 text-[15px] font-semibold sm:px-6">
          {t("deleteTitle")}
        </h2>
        <div className="flex flex-col gap-4 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <p className="flex-1 text-sm text-ink-soft">{t("deleteText")}</p>
          <DeleteAccount twoStep={Boolean(factors?.totp.length)} blocked={Boolean(blockers?.length)} />
        </div>
        {Boolean(blockers?.length) && (
          <div className="mx-5 mb-5 flex gap-2.5 rounded-[10px] bg-warning-soft px-3.5 py-3 text-[13px] leading-[19px] text-warning-ink sm:mx-6">
            <Icon name="alert" size={16} className="mt-0.5 flex-none" />
            <div className="flex flex-col gap-1">
              {holderOf.length > 0 && <p>{t("blockedHolder", { companies: holderOf.join(", ") })}</p>}
              {insurance && <p>{t("blockedInsurance", { email: CONTACT.support })}</p>}
              {staff && <p>{t("blockedStaff")}</p>}
              {records && !insurance && <p>{t("blockedRecords", { email: CONTACT.support })}</p>}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
