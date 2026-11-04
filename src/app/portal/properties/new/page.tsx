import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { loadCatalog } from "@/features/catalog/load";
import { myAccounts } from "@/features/companies/accounts";
import { canEditProperties } from "@/features/properties/load";
import { NewPropertyForm } from "@/features/properties/NewPropertyForm";
import { siteHref } from "@/lib/site-href";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties.new");
  return { title: t("title"), robots: { index: false } };
}

/** "Új ingatlan" in the personal account: a focused page without the app navigation. */
export default async function NewProperty() {
  const me = (await myAccounts()).find((a) => a.kind === "person");
  if (!me || !canEditProperties(me.role)) notFound();
  const [{ property_type: types }, listHref] = await Promise.all([loadCatalog("property_type"), siteHref("portal", "/properties")]);
  return <NewPropertyForm accountId={me.id} types={types} listHref={listHref} />;
}
