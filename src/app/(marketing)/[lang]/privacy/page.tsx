import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/LegalPage";
import { LEGAL_EFFECTIVE } from "@/content/legal/hosting";
import { PrivacyContent } from "@/content/legal/Privacy";
import { isLocale, type Locale } from "@/i18n/config";
import { publicAlternates } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("privacyTitle"), alternates: publicAlternates("privacy", locale) };
}

export default async function Privacy({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage locale={locale} page="privacy" title={t("privacyTitle")} effective={LEGAL_EFFECTIVE.privacy}>
      <PrivacyContent locale={locale} />
    </LegalPage>
  );
}
