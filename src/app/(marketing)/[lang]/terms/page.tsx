import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/LegalPage";
import { LEGAL_EFFECTIVE } from "@/content/legal/hosting";
import { TermsContent } from "@/content/legal/Terms";
import { isLocale, type Locale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("termsTitle"), ...publicPageMetadata("terms", locale) };
}

export default async function Terms({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage locale={locale} page="terms" title={t("termsTitle")} effective={LEGAL_EFFECTIVE.terms} note={t("termsBindingNote")}>
      <TermsContent locale={locale} />
    </LegalPage>
  );
}
