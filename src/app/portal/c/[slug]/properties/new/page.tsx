import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { loadCatalog } from "@/features/catalog/load";
import { companyBySlug } from "@/features/companies/accounts";
import { canEditProperties } from "@/features/properties/load";
import { NewPropertyForm } from "@/features/properties/NewPropertyForm";
import { siteHref } from "@/lib/site-href";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties.new");
  return { title: t("title"), robots: { index: false } };
}

/** "Új ingatlan" in a company account (owners, admins and managers). */
export default async function NewCompanyProperty({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account || !canEditProperties(account.role)) notFound();
  const [{ property_type: types }, listHref] = await Promise.all([loadCatalog("property_type"), siteHref("portal", `/c/${slug}/properties`)]);
  return <NewPropertyForm accountId={account.id} types={types} listHref={listHref} />;
}
