import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { AiImageLabel } from "@/components/site/AiImageLabel";
import { EXAMPLE_DEPOSIT } from "@/content/example";
import { PHOTOS } from "@/content/photos";
import type { Locale } from "@/i18n/config";
import { money } from "@/lib/format";

/** Tenant and landlord on the same side: key-handover photo with a floating confirmation chip. */
export async function TrustSection({ locale }: { locale: Locale }) {
  const t = await getTranslations("comingSoon.trust");

  return (
    <section aria-labelledby="trust-title" className="pt-[clamp(72px,9vw,128px)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-[clamp(32px,5vw,72px)] px-4 sm:px-6">
        <div data-reveal className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
          <span className="text-[13px] font-bold tracking-[1.5px] text-brand">{t("eyebrow")}</span>
          <h2 id="trust-title" className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-bold tracking-[-0.03em]">
            {t.rich("title", { mark: (chunks) => <span className="marker-in">{chunks}</span> })}
          </h2>
          <p className="text-[clamp(18px,1.6vw,22px)] leading-normal text-muted">{t("lead")}</p>
        </div>
        <div data-reveal style={{ "--d": 1 } as React.CSSProperties} className="min-w-0 flex-[1.35_1_520px]">
          <figure className="relative h-[clamp(360px,36vw,520px)] overflow-hidden rounded-[32px] bg-ink">
            <Image
              src={PHOTOS.keyHandover.src}
              alt={t("alt")}
              fill
              sizes="(max-width: 960px) 100vw, 680px"
              placeholder="blur"
              className={`photo-zoom object-cover ${PHOTOS.keyHandover.focus}`}
            />
            <div className="chip-in absolute bottom-4 left-4 z-[2] flex items-center gap-3 rounded-[20px] bg-surface py-3 pr-4.5 pl-3 shadow-[0_18px_40px_-18px_rgba(12,31,25,.55)] sm:bottom-7 sm:left-7">
              <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-xl bg-lime text-ink">
                <Icon name="check" size={18} strokeWidth={2.6} />
              </span>
              <span className="flex flex-col gap-0.5">
                <b className="text-[15px] text-ink">{t("chipTitle")}</b>
                <span className="text-[13px] text-muted">{t("chipText", { amount: money(EXAMPLE_DEPOSIT, locale) })}</span>
              </span>
            </div>
          </figure>
          <AiImageLabel className="mt-2.5 mr-1.5" />
        </div>
      </div>
    </section>
  );
}
