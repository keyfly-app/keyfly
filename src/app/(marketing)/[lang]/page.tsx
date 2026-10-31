import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RevealObserver } from "@/components/site/RevealObserver";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WaitlistForm } from "@/features/waitlist/WaitlistForm";
import { isLocale, publicHref, type Locale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/metadata";
import { AudienceSection } from "./_sections/AudienceSection";
import { ExampleCard } from "./_sections/ExampleCard";
import { FaqSection } from "./_sections/FaqSection";
import { PhotoBand } from "./_sections/PhotoBand";
import { StepsSection } from "./_sections/StepsSection";
import { StructuredData } from "./_sections/StructuredData";
import { TrustSection } from "./_sections/TrustSection";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return publicPageMetadata("home", isLocale(lang) ? lang : "hu");
}

export default async function ComingSoon({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "hu";
  setRequestLocale(locale);
  const t = await getTranslations("comingSoon");

  return (
    <div className="overflow-x-clip">
      <SiteHeader locale={locale} page="home" />
      <main>
        <section className="relative">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="anim-float absolute top-10 -right-45 size-[620px] rounded-full border-[1.5px] border-line" />
            <div className="absolute top-40 -right-15 size-[380px] rounded-full bg-mist" />
          </div>
          <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center gap-10 px-4 pt-10 pb-16 sm:gap-18 sm:px-6 sm:pt-22 sm:pb-28">
            <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-6">
              <h1 className="anim-rise font-display text-[clamp(46px,7vw,96px)] leading-[.98] font-bold tracking-[-0.035em]">
                {t("titleStart")} <span className="marker">{t("titleHighlight")}</span>
              </h1>
              <p className="anim-rise delay-1 max-w-[600px] text-[clamp(18px,1.6vw,22px)] leading-normal text-muted">{t("lead")}</p>
              <div id="waitlist" className="anim-rise delay-2 mt-2 scroll-mt-6">
                <WaitlistForm locale={locale} privacyHref={publicHref("privacy", locale)} />
              </div>
            </div>
            <ExampleCard locale={locale} />
          </div>
        </section>
        <PhotoBand />
        <AudienceSection />
        <StepsSection />
        <TrustSection locale={locale} />
        <FaqSection locale={locale} />
      </main>
      <SiteFooter locale={locale} />
      <RevealObserver />
      <StructuredData locale={locale} />
    </div>
  );
}
