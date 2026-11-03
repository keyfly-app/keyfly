import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { companyBySlug } from "@/features/companies/accounts";
import { MenuPage } from "@/features/settings/MenuPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("menu");
  return { title: t("title"), robots: { index: false } };
}

/** The phone Menu in a company account: also the company's settings. */
export default async function CompanyMenu({ params }: { params: Promise<{ slug: string }> }) {
  const account = await companyBySlug((await params).slug);
  if (!account) notFound();
  return (
    <Shell account={account}>
      <MenuPage account={account} />
    </Shell>
  );
}
