import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RevealObserver } from "@/components/site/RevealObserver";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { isLocale, type Locale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { ProFeatures } from "./_sections/ProFeatures";
import { ProHero } from "./_sections/ProHero";
import { ProPlans } from "./_sections/ProPlans";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  const t = await getTranslations({ locale, namespace: "pro.meta" });
  return { title: { absolute: t("title") }, description: t("description"), ...publicPageMetadata("pro", locale) };
}

/** Keyfly Pro: the paid workspace for landlords and property managers (coming soon). */
export default async function ProPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  setRequestLocale(locale);

  return (
    <div className="overflow-x-clip">
      <SiteHeader locale={locale} page="pro" signupHref="#signup" />
      <main>
        <ProHero locale={locale} />
        <ProFeatures />
        <ProPlans />
      </main>
      <SiteFooter locale={locale} signupFor="landlords" />
      <RevealObserver />
    </div>
  );
}
