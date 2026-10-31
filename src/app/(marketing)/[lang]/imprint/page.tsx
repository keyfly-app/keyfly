import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/LegalPage";
import { LEGAL_EFFECTIVE } from "@/content/legal/hosting";
import { ImprintContent } from "@/content/legal/Imprint";
import { isLocale, type Locale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("imprintTitle"), ...publicPageMetadata("imprint", locale) };
}

export default async function Imprint({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage locale={locale} page="imprint" title={t("imprintTitle")} effective={LEGAL_EFFECTIVE.imprint}>
      <ImprintContent locale={locale} />
    </LegalPage>
  );
}
