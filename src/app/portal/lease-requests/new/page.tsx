import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { loadCatalog } from "@/features/catalog/load";
import { RequestWizard } from "@/features/lease-requests/RequestWizard";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaseRequest");
  return { title: t("flow.title"), robots: { index: false } };
}

/** The tenant invites the landlord: a focused flow with its own header (no app navigation). Sign-in: proxy.ts. */
export default async function NewLeaseRequest() {
  const supabase = await createClient();
  const [{ data: auth }, { property_type: kinds }, homeHref] = await Promise.all([
    supabase.auth.getClaims(),
    loadCatalog("property_type"),
    siteHref("portal", "/"),
  ]);
  return <RequestWizard myEmail={String(auth?.claims.email ?? "")} homeHref={homeHref} kinds={kinds} />;
}
