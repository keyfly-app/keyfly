import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { myAccounts } from "@/features/companies/accounts";
import { ImportPage } from "@/features/properties/ImportPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties.import");
  return { title: t("title"), robots: { index: false } };
}

/** "Ingatlanok importálása" in the personal account. */
export default async function ImportProperties() {
  return <ImportPage account={(await myAccounts()).find((a) => a.kind === "person")} base="" />;
}
