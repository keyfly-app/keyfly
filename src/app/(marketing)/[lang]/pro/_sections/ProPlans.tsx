import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { PRO_PLANS } from "@/features/pro/config";

/** Basic (free cover), Pro and Business plans – prices are announced before launch. */
export async function ProPlans() {
  const t = await getTranslations("pro");
  return (
    <section id="plans" aria-labelledby="plans-title" className="scroll-mt-6 py-[clamp(72px,9vw,128px)]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-4 sm:px-6">
        <div data-reveal className="flex flex-col gap-2">
          <span className="text-[13px] font-bold tracking-[1.5px] text-brand">{t("plansEyebrow")}</span>
          <h2 id="plans-title" className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-bold tracking-[-0.03em]">
            {t("plansTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-stretch gap-5">
          {PRO_PLANS.map((plan, i) => {
            const highlight = plan === "pro";
            const badge = plan === "basic" ? null : t(`plans.${plan}.badge`);
            return (
              <article
                key={plan}
                data-reveal
                style={{ "--d": i } as React.CSSProperties}
                className={`flex flex-col gap-4.5 rounded-[28px] p-7 ${highlight ? "on-dark bg-brand text-white" : "border border-line bg-surface"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <h3 className={`text-[13px] font-bold tracking-[1.5px] ${highlight ? "text-lime" : "text-brand"}`}>
                    {t(`plans.${plan}.label`)}
                  </h3>
                  {badge && (
                    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${highlight ? "bg-lime text-ink" : "bg-mist text-brand"}`}>
                      {badge}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="font-display text-[30px] leading-[1.1] font-bold tracking-[-0.02em]">{t(`plans.${plan}.price`)}</p>
                  <p className={`text-[15px] leading-snug ${highlight ? "text-fog" : "text-muted"}`}>{t(`plans.${plan}.sub`)}</p>
                </div>
                <ul className={`flex flex-col gap-2.5 text-base leading-snug ${highlight ? "text-white" : "text-ink-soft"}`}>
                  {(t.raw(`plans.${plan}.items`) as string[]).map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex size-5.5 flex-none items-center justify-center rounded-full ${highlight ? "bg-lime text-ink" : "bg-mist text-brand"}`}
                      >
                        <Icon name="check" size={13} strokeWidth={2.8} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <p data-reveal className="max-w-[820px] text-sm leading-normal text-muted">
          {t("plansNote")}
        </p>
        <div data-reveal className="flex flex-wrap items-center justify-between gap-5 rounded-[28px] bg-lime-soft p-[clamp(22px,3vw,36px)]">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1.5">
            <p className="font-display text-[clamp(22px,2.2vw,28px)] font-bold tracking-[-0.02em]">{t("cta.title")}</p>
            <p className="text-base leading-normal text-ink-soft">{t("cta.text")}</p>
          </div>
          <a
            href="#signup"
            className="inline-flex h-13.5 items-center rounded-full bg-brand px-6.5 text-base font-bold text-white no-underline transition-colors hover:bg-brand-dark"
          >
            {t("signup")}
          </a>
        </div>
      </div>
    </section>
  );
}
