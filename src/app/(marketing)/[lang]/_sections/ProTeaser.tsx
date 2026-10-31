import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { PRO_FEATURES } from "@/features/pro/config";
import { ProPreview } from "@/features/pro/ProPreview";
import { publicHref, type Locale } from "@/i18n/config";

/** Short Keyfly Pro teaser for landlords; the details live on the Pro page. */
export async function ProTeaser({ locale }: { locale: Locale }) {
  const t = await getTranslations("pro");

  return (
    <section aria-labelledby="pro-title" className="mt-[clamp(72px,9vw,128px)] border-t border-line bg-surface py-[clamp(72px,9vw,128px)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-[clamp(32px,5vw,72px)] px-4 sm:px-6">
        <div className="min-w-0 flex-[1.15_1_520px]">
          <ProPreview
            locale={locale}
            notifications={1}
            photoClassName="h-[clamp(420px,40vw,560px)]"
            focus="object-[88%_50%]"
            sizes="(max-width: 960px) 100vw, 620px"
          />
        </div>
        <div data-reveal style={{ "--d": 1 } as React.CSSProperties} className="flex min-w-0 flex-[1_1_380px] flex-col gap-4.5">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-mist px-3.5 py-2 text-[13px] font-bold tracking-[1.5px] text-brand">
            <span aria-hidden="true" className="anim-pulse size-2 rounded-full bg-brand" />
            {t("teaserEyebrow")}
          </span>
          <h2 id="pro-title" className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-bold tracking-[-0.03em]">
            {t.rich("title", { mark: (chunks) => <span className="marker-in">{chunks}</span> })}
          </h2>
          <p className="text-lg leading-normal text-muted">{t("lead")}</p>
          <ul className="flex flex-wrap gap-2">
            {PRO_FEATURES.map(({ key, icon }) => (
              <li
                key={key}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface pr-3.5 pl-2.5 text-sm font-semibold"
              >
                <Icon name={icon} size={18} className="text-brand" />
                {t(`features.${key}.title`)}
              </li>
            ))}
          </ul>
          <div className="mt-1.5 flex flex-wrap gap-3">
            <Link
              href={publicHref("pro", locale)}
              className="inline-flex h-13.5 items-center gap-2.5 rounded-full bg-brand px-6 text-base font-bold text-white no-underline transition-colors hover:bg-brand-dark"
            >
              {t("details")}
              <Icon name="arrow" size={18} strokeWidth={2.2} />
            </Link>
            <a
              href="#waitlist"
              className="inline-flex h-13.5 items-center rounded-full border-[1.5px] border-brand px-6 text-base font-bold text-brand no-underline transition-colors hover:bg-mist"
            >
              {t("signup")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
