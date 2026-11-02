import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TwoStepSetup } from "@/features/security/TwoStepSetup";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("security.setup");
  return { title: t("title"), robots: { index: false } };
}

/** Turning on two-step verification: a focused flow, back to Bejelentkezés és biztonság when done. */
export default async function TwoStepSetupPage() {
  const supabase = await createClient();
  const [back, home] = await Promise.all([siteHref("portal", "/settings/security"), siteHref("portal", "/")]);
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.length) redirect(back);
  return <TwoStepSetup backHref={back} homeHref={home} />;
}
