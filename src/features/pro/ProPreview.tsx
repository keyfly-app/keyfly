import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/Icon";
import { AiImageLabel } from "@/components/site/AiImageLabel";
import { EXAMPLE } from "@/content/example";
import { PHOTOS } from "@/content/photos";
import type { Locale } from "@/i18n/config";
import { date, money } from "@/lib/format";
import { PREVIEW_DATES } from "./config";

/** Landlord photo with an illustrative Keyfly Pro property card and notifications on top (stacked under it on phones). */
export async function ProPreview({
  locale,
  notifications = 2,
  photoClassName,
  sizes,
  focus = PHOTOS.proLandlord.focus,
}: {
  locale: Locale;
  notifications?: 1 | 2;
  photoClassName: string;
  sizes: string;
  /** object-position override when the photo is cropped narrower than usual. */
  focus?: string;
}) {
  const t = await getTranslations("pro.preview");
  const rows: [string, string][] = [
    [t("tenant"), t("tenantName")],
    [t("rent"), t("rentValue", { amount: money(EXAMPLE.rent, locale) })],
    [t("leaseEnd"), date(PREVIEW_DATES.leaseEnd, locale)],
  ];
  const toasts: [IconName, string, string][] = [
    ["gauge", t("meterTitle"), t("meterText")],
    ["bell", t("paymentTitle"), t("paymentText", { date: date(PREVIEW_DATES.paymentDue, locale) })],
  ];

  return (
    <div data-reveal>
      <div className="relative">
        <figure className={`relative overflow-hidden rounded-[32px] bg-mist ${photoClassName}`}>
          <Image
            src={PHOTOS.proLandlord.src}
            alt={t("photoAlt")}
            fill
            sizes={sizes}
            placeholder="blur"
            className={`photo-zoom object-cover ${focus}`}
          />
        </figure>
        <div className="relative z-[2] mx-3 -mt-16 flex flex-col gap-3 sm:absolute sm:bottom-8 sm:left-8 sm:m-0 sm:w-[min(360px,calc(100%-64px))]">
          <div className="line-in rounded-[22px] bg-surface px-5 py-4.5 shadow-[0_30px_60px_-30px_rgba(12,31,25,.55)]">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <span className="inline-flex items-center gap-2.5 text-xs font-bold tracking-[1.4px] text-muted">
                <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-[10px] bg-mist text-brand">
                  <Icon name="home" size={17} />
                </span>
                {t("label")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-2.5 py-1.5 text-xs font-bold text-brand">
                <Icon name="check" size={13} strokeWidth={2.6} />
                {t("status")}
              </span>
            </div>
            <p className="mt-3 mb-1.5 font-display text-xl font-bold tracking-[-0.02em]">{t("address")}</p>
            <dl className="text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-t border-line py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {toasts.slice(0, notifications).map(([icon, title, text], i) => (
            <div
              key={title}
              style={{ "--d": i + 1 } as React.CSSProperties}
              className="line-in flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 shadow-[0_24px_48px_-26px_rgba(12,31,25,.55)]"
            >
              <span aria-hidden="true" className="flex size-9.5 flex-none items-center justify-center rounded-xl bg-lime text-ink">
                <Icon name={icon} size={19} strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-col">
                <b className="text-[15px]">{title}</b>
                <span className="text-[13px] text-muted">{text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <AiImageLabel className="mt-2.5 mr-1.5" />
    </div>
  );
}
