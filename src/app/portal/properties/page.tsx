import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { myAccounts } from "@/features/companies/accounts";
import { PropertiesPage, readPropertyFilter } from "@/features/properties/PropertiesPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties");
  return { title: t("title"), robots: { index: false } };
}

/** "Ingatlanok" of the personal account. */
export default async function Properties({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const [{ filter, q }, accounts] = await Promise.all([searchParams, myAccounts()]);
  const me = accounts.find((a) => a.kind === "person");
  if (!me) notFound();
  return (
    <Shell>
      <PropertiesPage account={me} base="" filter={readPropertyFilter(filter)} query={typeof q === "string" ? q.slice(0, 80) : ""} />
    </Shell>
  );
}
