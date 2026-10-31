import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { PRO_FEATURES } from "@/features/pro/config";

/** Every Keyfly Pro feature with its details. */
export async function ProFeatures() {
  const t = await getTranslations("pro");
  return (
    <section aria-labelledby="features-title" className="border-t border-line bg-surface py-[clamp(72px,9vw,128px)]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-4 sm:px-6">
        <div data-reveal className="flex flex-col gap-2">
          <span className="text-[13px] font-bold tracking-[1.5px] text-brand">{t("featuresEyebrow")}</span>
          <h2 id="features-title" className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-bold tracking-[-0.03em]">
            {t("featuresTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
          {PRO_FEATURES.map(({ key, icon }, i) => (
            <article
              key={key}
              data-reveal
              style={{ "--d": i % 3 } as React.CSSProperties}
              className="flex flex-col gap-3.5 rounded-3xl border border-line bg-surface p-6.5 transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-[14px] bg-mist text-brand">
                <Icon name={icon} size={24} />
              </span>
              <h3 className="font-display text-xl font-bold tracking-[-0.01em]">{t(`features.${key}.title`)}</h3>
              <ul className="flex flex-col gap-2 text-[15px] leading-normal text-ink-soft">
                {(t.raw(`features.${key}.items`) as string[]).map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span aria-hidden="true" className="mt-0.75 flex size-4.5 flex-none items-center justify-center rounded-full bg-mist text-brand">
                      <Icon name="check" size={11} strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
