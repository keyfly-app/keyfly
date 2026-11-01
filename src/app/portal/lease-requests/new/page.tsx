import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { RequestWizard } from "@/features/lease-requests/RequestWizard";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaseRequest");
  return { title: t("inviteLandlord") };
}

/** Steps 1–3: the tenant invites the landlord. */
export default async function NewLeaseRequest() {
  const t = await getTranslations("leaseRequest");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  return (
    <AuthLayout back={{ href: await siteHref("portal", "/"), label: t("homeTitle") }}>
      <RequestWizard myEmail={String(auth?.claims.email ?? "")} />
    </AuthLayout>
  );
}
