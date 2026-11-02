import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { canManage, companyBySlug } from "@/features/companies/accounts";
import { CompanyDetailsView } from "@/features/companies/CompanyDetailsView";
import { isLocale } from "@/i18n/config";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("companies.details");
  return { title: t("title"), robots: { index: false } };
}

/** Cégadatok: loads the company row and its owner. */
export default async function CompanyDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const supabase = await createClient();
  const [raw, { data: company }, { data: members }, backHref] = await Promise.all([
    getLocale(),
    supabase.from("accounts").select("name, legal_name, tax_number, registered_address, nav_verified_at").eq("id", account.id).single(),
    supabase.rpc("account_members_list", { p_account_id: account.id }),
    siteHref("portal", `/c/${slug}/settings`),
  ]);
  if (!company) notFound();
  const owner = members?.find((m) => m.role === "owner");
  return (
    <CompanyDetailsView
      accountId={account.id}
      manage={canManage(account)}
      locale={isLocale(raw) ? raw : "hu"}
      backHref={backHref}
      company={company}
      owner={owner ? { name: owner.full_name, email: owner.email } : null}
    />
  );
}
