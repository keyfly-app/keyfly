import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { companyBySlug } from "@/features/companies/accounts";
import { ImportPage } from "@/features/properties/ImportPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties.import");
  return { title: t("title"), robots: { index: false } };
}

/** "Ingatlanok importálása" in a company account. */
export default async function ImportCompanyProperties({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ImportPage account={await companyBySlug(slug)} base={`/c/${slug}`} />;
}
