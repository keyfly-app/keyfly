import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/LegalPage";
import { LEGAL_EFFECTIVE } from "@/content/legal/hosting";
import { AppPrivacyContent } from "@/content/legal/AppPrivacy";
import { isLocale, type Locale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("appPrivacyTitle"), ...publicPageMetadata("appPrivacy", locale) };
}

export default async function AppPrivacy({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage locale={locale} page="appPrivacy" title={t("appPrivacyTitle")} effective={LEGAL_EFFECTIVE.appPrivacy}>
      <AppPrivacyContent locale={locale} />
    </LegalPage>
  );
}
