import { getTranslations } from "next-intl/server";
import { ProPreview } from "@/features/pro/ProPreview";
import type { Locale } from "@/i18n/config";

export async function ProHero({ locale }: { locale: Locale }) {
  const t = await getTranslations("pro");
  return (
    <section aria-labelledby="pro-title" className="pt-[clamp(40px,6vw,88px)] pb-[clamp(56px,7vw,96px)]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-[clamp(36px,5vw,64px)] px-4 sm:px-6">
        <div className="flex max-w-[860px] flex-col gap-4.5">
          <span className="anim-rise inline-flex items-center gap-2 self-start rounded-full bg-mist px-3.5 py-2 text-[13px] font-bold tracking-[1.5px] text-brand">
            <span aria-hidden="true" className="anim-pulse size-2 rounded-full bg-brand" />
            {t("eyebrow")}
          </span>
          <h1 id="pro-title" className="anim-rise font-display text-[clamp(46px,7vw,96px)] leading-[.98] font-bold tracking-[-0.035em]">
            {t.rich("title", { mark: (chunks) => <span className="marker">{chunks}</span> })}
          </h1>
          <p className="anim-rise delay-1 max-w-[720px] text-[clamp(18px,1.6vw,22px)] leading-normal text-muted">{t("lead")}</p>
          <div className="anim-rise delay-2 mt-1 flex flex-wrap gap-3">
            <a
              href="#signup"
              className="inline-flex h-14 items-center rounded-full bg-brand px-6.5 text-base font-bold text-white no-underline transition-colors hover:bg-brand-dark"
            >
              {t("heroSignup")}
            </a>
            <a
              href="#plans"
              className="inline-flex h-14 items-center rounded-full border-[1.5px] border-brand px-6.5 text-base font-bold text-brand no-underline transition-colors hover:bg-mist"
            >
              {t("plansLink")}
            </a>
          </div>
        </div>
        <ProPreview locale={locale} photoClassName="h-[clamp(460px,46vw,600px)]" sizes="(max-width: 1248px) 100vw, 1200px" />
      </div>
    </section>
  );
}
