import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/Icon";

const STEPS: { key: "details" | "income" | "offer"; icon: IconName }[] = [
  { key: "details", icon: "home" },
  { key: "income", icon: "bank" },
  { key: "offer", icon: "document" },
];

/** How requesting an offer works – and that it takes minutes. */
export async function StepsSection() {
  const t = await getTranslations("comingSoon.steps");

  return (
    <section aria-labelledby="steps-title" className="on-dark bg-brand-deep py-[clamp(72px,9vw,128px)] text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-12 px-4 sm:gap-24 sm:px-6">
        <div data-reveal className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
          <span className="text-[13px] font-bold tracking-[1.5px] text-lime">{t("eyebrow")}</span>
          <h2 id="steps-title" className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-bold tracking-[-0.03em]">
            {t("title")}
          </h2>
          <p aria-hidden="true" className="mt-3 flex items-end gap-3.5 font-display font-bold text-lime">
            <span className="rise-in text-[clamp(132px,16vw,232px)] leading-[.82] tracking-[-0.06em]">{t("durationValue")}</span>
            <span className="pb-1.5 text-[clamp(36px,4vw,56px)] leading-none">{t("durationUnit")}</span>
          </p>
          <p className="max-w-[420px] text-[17px] leading-normal text-fog">{t("durationText")}</p>
        </div>

        <div data-reveal className="relative min-w-0 flex-[1.3_1_480px]">
          <span aria-hidden="true" className="absolute top-14 bottom-14 left-[27px] w-0.5 bg-white/12">
            <span className="progress-line block h-full w-0.5 bg-lime" />
          </span>
          <ol className="relative flex flex-col gap-11">
            {STEPS.map(({ key, icon }, i) => (
              <li key={key} data-reveal style={{ "--d": i } as React.CSSProperties} className="flex items-start gap-5">
                <span
                  aria-hidden="true"
                  className="relative flex size-14 flex-none items-center justify-center rounded-2xl border border-lime/35 bg-pine text-lime"
                >
                  <Icon name={icon} size={26} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
                    <h3 className="font-display text-[22px] leading-tight font-semibold">
                      <span className="sr-only">{i + 1}. </span>
                      {t(`items.${key}.title`)}
                    </h3>
                    <span className="slide-in inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-[13px] font-bold text-ink">
                      <Icon name="clock" size={14} strokeWidth={2.4} />
                      {t(`items.${key}.time`)}
                    </span>
                  </div>
                  <p className="text-[17px] leading-normal text-fog">{t(`items.${key}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
