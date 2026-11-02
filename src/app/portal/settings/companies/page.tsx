import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { myAccounts } from "@/features/companies/accounts";
import { MyCompaniesView } from "@/features/companies/MyCompaniesView";
import { isLocale } from "@/i18n/config";
import { date } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.companies");
  return { title: t("title"), robots: { index: false } };
}

/** Cégeim: loads your company memberships (with tax numbers) and your pending access requests. */
export default async function MyCompanies() {
  const [raw, accounts, supabase] = await Promise.all([getLocale(), myAccounts(), createClient()]);
  const locale = isLocale(raw) ? raw : "hu";
  const companies = accounts.filter((acc) => acc.kind === "company" && acc.slug);
  const [{ data: details }, { data: requests }, addHref] = await Promise.all([
    companies.length ? supabase.from("accounts").select("id, tax_number").in("id", companies.map((c) => c.id)) : Promise.resolve({ data: [] as { id: string; tax_number: string | null }[] }),
    supabase.rpc("my_access_requests"),
    siteHref("portal", "/companies/new"),
  ]);
  const rows = await Promise.all(
    companies.map(async (c) => ({
      ...c,
      tax: details?.find((d) => d.id === c.id)?.tax_number ?? "",
      open: await siteHref("portal", `/c/${c.slug}`),
      detailsHref: await siteHref("portal", `/c/${c.slug}/settings/company`),
      teamHref: await siteHref("portal", `/c/${c.slug}/settings/team`),
    })),
  );
  return (
    <MyCompaniesView
      rows={rows}
      requests={(requests ?? []).map((r) => ({ id: r.id, name: r.name, tax_number: r.tax_number, requested: date(r.created_at, locale).replace(/ /g, "\u00a0") }))}
      addHref={addHref}
    />
  );
}
