import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AddCompanyFlow } from "@/features/companies/AddCompanyFlow";
import { currentUser } from "@/features/settings/current-user";
import { siteHref } from "@/lib/site-href";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("companies");
  return { title: t("flow.title"), robots: { index: false } };
}

/** Add a company account (focused flow, no app navigation). Sign-in: proxy.ts. */
export default async function NewCompany() {
  const [user, home, prefix] = await Promise.all([currentUser(), siteHref("portal", "/"), siteHref("portal", "/c/")]);
  return <AddCompanyFlow homeHref={home} myName={user?.fullName ?? user?.email ?? ""} companyPrefix={prefix} />;
}
