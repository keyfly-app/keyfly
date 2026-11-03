import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { companyBySlug } from "@/features/companies/accounts";
import { LeasesPage, readFilter } from "@/features/leases/LeasesPage";
import { siteHref } from "@/lib/site-href";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [account, t] = await Promise.all([companyBySlug((await params).slug), getTranslations("nav")]);
  return { title: t(`leases.${account?.view ?? "landlord"}`), robots: { index: false } };
}

/**
 * The company's leases in its View. No invite button: "Bérbeadó meghívása" records in the personal account today, so a
 * company as tenant only sees requests sent in its name.
 */
export default async function CompanyLeases({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ filter?: string }> }) {
  const [{ slug }, { filter }] = await Promise.all([params, searchParams]);
  const account = await companyBySlug(slug);
  if (!account) notFound();
  return (
    <Shell account={account}>
      <LeasesPage account={account} view={account.view ?? "landlord"} filter={readFilter(filter)} listHref={await siteHref("portal", `/c/${slug}/leases`)} />
    </Shell>
  );
}
