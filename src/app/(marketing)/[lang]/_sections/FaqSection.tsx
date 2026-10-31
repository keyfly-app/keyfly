import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { CONTACT } from "@/config/company";
import type { Locale } from "@/i18n/config";
import { money } from "@/lib/format";
import { EXAMPLE } from "./example";

const QUESTIONS = ["launch", "cost", "refund", "claim", "landlord"] as const;

export async function FaqSection({ locale }: { locale: Locale }) {
  const t = await getTranslations("comingSoon.faq");
  const values = { rent: money(EXAMPLE.rent, locale), fee: money(EXAMPLE.monthlyFee, locale) };

  return (
    <section aria-labelledby="faq-title" className="py-[clamp(72px,9vw,128px)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-x-20 gap-y-8 px-4 sm:px-6">
        <div className="reveal flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <h2 id="faq-title" className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-bold tracking-[-0.03em]">
            {t("title")}
          </h2>
          <p className="text-[17px] text-muted">{t("lead")}</p>
          <a
            href={`mailto:${CONTACT.hello}`}
            className="inline-flex min-h-11 items-center gap-2.5 self-start text-[17px] font-semibold text-brand underline-offset-3"
          >
            <Icon name="mail" size={20} />
            {CONTACT.hello}
          </a>
        </div>
        <div className="reveal min-w-0 flex-[2_1_520px] border-t border-line">
          {QUESTIONS.map((key, i) => (
            <details key={key} open={i === 0} className="group border-b border-line py-5.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-xl leading-snug font-semibold [&::-webkit-details-marker]:hidden">
                {t(`items.${key}.q`)}
                <span
                  aria-hidden="true"
                  className="flex size-9 flex-none items-center justify-center rounded-full bg-mist text-[22px] font-medium text-brand transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[640px] text-[17px] leading-relaxed text-muted">{t(`items.${key}.a`, values)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
