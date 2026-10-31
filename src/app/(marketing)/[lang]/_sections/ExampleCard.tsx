import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/Logo";
import type { Locale } from "@/i18n/config";
import { money } from "@/lib/format";
import { EXAMPLE, EXAMPLE_DEPOSIT } from "./example";

/** Worked example: rent, the deposit you no longer pay, the monthly fee. */
export async function ExampleCard({ locale }: { locale: Locale }) {
  const t = await getTranslations("comingSoon.example");
  const row = "flex justify-between gap-3 border-b border-white/12 pb-4";

  return (
    <aside
      aria-labelledby="example-label"
      className="anim-rise delay-3 flex max-w-[460px] min-w-0 flex-[1_1_360px] flex-col gap-5 rounded-[32px] bg-ink p-6 text-white shadow-[0_1px_2px_rgba(12,31,25,.06),0_40px_80px_-32px_rgba(12,31,25,.45)] sm:p-9"
    >
      <div className="flex items-center justify-between">
        <span id="example-label" className="text-[13px] font-bold tracking-[1.5px] text-lime">
          {t("label")}
        </span>
        <LogoMark size={34} />
      </div>
      <dl className="flex flex-col gap-4">
        <div className={row}>
          <dt className="text-fog">{t("rent")}</dt>
          <dd className="text-right font-semibold">
            {money(EXAMPLE.rent, locale)} {t("perMonth")}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-fog">{t("deposit")}</dt>
          <dd className="font-semibold">
            <span className="strike-lime">{money(EXAMPLE_DEPOSIT, locale)}</span>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-fog">{t("fee")}</dt>
          <dd className="font-display text-[clamp(34px,3.4vw,44px)] leading-[1.1] font-bold tracking-[-1px]">
            {t("approx", { amount: money(EXAMPLE.monthlyFee, locale) })}{" "}
            <span className="text-lg font-semibold tracking-normal text-fog">{t("perMonth")}</span>
          </dd>
        </div>
      </dl>
      <p className="anim-pop rounded-2xl bg-lime px-4.5 py-3.5 text-[17px] font-bold text-ink">
        {t("keep", { amount: money(EXAMPLE_DEPOSIT, locale) })}
      </p>
      <p className="text-[13px] leading-normal text-fog-dim">{t("disclaimer")}</p>
    </aside>
  );
}
