import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AddBankAccount, BankAccounts } from "@/features/bank/BankAccounts";
import { bankAccountsOf } from "@/features/bank/load";
import { myAccounts } from "@/features/companies/accounts";
import { currentUser } from "@/features/settings/current-user";
import { SettingsHeader } from "@/features/settings/SettingsHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.bank");
  return { title: t("title"), robots: { index: false } };
}

/** Bankszámlák (personal): where we pay this person's claims and refunds. */
export default async function PersonalBankAccounts() {
  const [t, user, accounts] = await Promise.all([getTranslations("settings.bank"), currentUser(), myAccounts()]);
  const personal = accounts.find((a) => a.kind === "person");
  if (!user || !personal) notFound();
  const rows = await bankAccountsOf(personal.id);
  return (
    <>
      <SettingsHeader title={t("title")} lead={t("lead")} action={rows.length > 0 && <AddBankAccount />} />
      <BankAccounts accountId={personal.id} accounts={rows} manage defaultHolder={user.fullName ?? ""} />
    </>
  );
}
