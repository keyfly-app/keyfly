import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AddBankAccount, BankAccounts } from "@/features/bank/BankAccounts";
import { bankAccountsOf } from "@/features/bank/load";
import { canManage, companyBySlug } from "@/features/companies/accounts";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.bank");
  return { title: t("title"), robots: { index: false } };
}

/** Bankszámlák (company): owners and admins manage them, other members see them. */
export default async function CompanyBankAccounts({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const manage = canManage(account);
  const supabase = await createClient();
  const [t, rows, { data: company }, backHref] = await Promise.all([
    getTranslations("settings.bank"),
    bankAccountsOf(account.id),
    supabase.from("accounts").select("legal_name").eq("id", account.id).maybeSingle(),
    siteHref("portal", `/c/${slug}/settings`),
  ]);
  return (
    <>
      <SettingsHeader title={t("title")} lead={manage ? t("lead") : t("readOnly")} backHref={backHref} action={manage && rows.length > 0 && <AddBankAccount />} />
      <BankAccounts accountId={account.id} accounts={rows} manage={manage} defaultHolder={company?.legal_name ?? account.name} />
    </>
  );
}
