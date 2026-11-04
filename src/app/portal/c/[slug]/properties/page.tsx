import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { companyBySlug } from "@/features/companies/accounts";
import { PropertiesPage, readPropertyFilter } from "@/features/properties/PropertiesPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties");
  return { title: t("title"), robots: { index: false } };
}

/** "Ingatlanok" of a company account. */
export default async function CompanyProperties({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const [{ slug }, { filter, q }] = await Promise.all([params, searchParams]);
  const account = await companyBySlug(slug);
  if (!account) notFound();
  return (
    <Shell account={account}>
      <PropertiesPage account={account} base={`/c/${slug}`} filter={readPropertyFilter(filter)} query={typeof q === "string" ? q.slice(0, 80) : ""} />
    </Shell>
  );
}
