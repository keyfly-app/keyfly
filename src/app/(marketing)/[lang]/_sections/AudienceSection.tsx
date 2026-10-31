import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { AiImageBadge } from "@/components/site/AiImageBadge";
import { PHOTOS } from "@/content/photos";

const TENANT_ITEMS = ["upfront", "savings", "online"] as const;
const LANDLORD_ITEMS = ["cover", "admin", "free"] as const;

/** Why Keyfly works for tenants and for landlords. */
export async function AudienceSection() {
  const t = await getTranslations("comingSoon.audience");

  return (
    <section aria-labelledby="audience-title" className="border-t border-line bg-surface py-[clamp(72px,9vw,128px)]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 sm:gap-14 sm:px-6">
        <div data-reveal className="flex max-w-[760px] flex-col gap-4">
          <span className="text-[13px] font-bold tracking-[1.5px] text-brand">{t("eyebrow")}</span>
          <h2 id="audience-title" className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-bold tracking-[-0.03em]">
            {t.rich("title", { mark: (chunks) => <span className="marker-in">{chunks}</span> })}
          </h2>
          <p className="text-[clamp(18px,1.6vw,22px)] leading-normal text-muted">{t("lead")}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-6">
          <Card
            photo={{ ...PHOTOS.firstEvening, alt: t("tenant.photo.alt"), lines: [t("tenant.photo.line1"), t("tenant.photo.line2")] }}
            label={t("tenant.label")}
            title={t("tenant.title")}
            items={TENANT_ITEMS.map((k) => t(`tenant.items.${k}`))}
          />
          <Card
            photo={{ ...PHOTOS.landlord, alt: t("landlord.photo.alt"), lines: [t("landlord.photo.line1"), t("landlord.photo.line2")] }}
            label={t("landlord.label")}
            title={t("landlord.title")}
            items={LANDLORD_ITEMS.map((k) => t(`landlord.items.${k}`))}
            dark
            delay={1}
          />
        </div>
      </div>
    </section>
  );
}

type CardPhoto = (typeof PHOTOS)[keyof typeof PHOTOS] & { alt: string; lines: [string, string] };

function Card({
  photo,
  label,
  title,
  items,
  dark = false,
  delay = 0,
}: {
  photo: CardPhoto;
  label: string;
  title: string;
  items: string[];
  dark?: boolean;
  delay?: number;
}) {
  return (
    <article
      data-reveal
      style={{ "--d": delay } as React.CSSProperties}
      className={`flex flex-col gap-6 overflow-hidden rounded-[32px] p-7 transition-transform duration-300 ease-out hover:-translate-y-1 sm:p-12 ${
        dark ? "on-dark bg-ink text-white" : "border border-line bg-paper"
      }`}
    >
      <figure className="relative -mx-7 -mt-7 h-[clamp(220px,22vw,300px)] overflow-hidden bg-ink sm:-mx-12 sm:-mt-12">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 960px) 100vw, 600px"
          placeholder="blur"
          className={`photo-zoom object-cover ${photo.focus}`}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink/82 via-ink/30 via-45% to-ink/0 to-72%" />
        <figcaption className="absolute inset-x-5 bottom-4.5 font-display text-[clamp(22px,2vw,28px)] leading-[1.12] font-bold tracking-[-0.02em] text-white sm:inset-x-9 sm:bottom-7">
          <span className="line-in block" style={{ "--d": 1 } as React.CSSProperties}>
            {photo.lines[0]}
          </span>
          <span className="line-in block text-lime" style={{ "--d": 2 } as React.CSSProperties}>
            {photo.lines[1]}
          </span>
        </figcaption>
        <AiImageBadge />
      </figure>
      <div className="flex flex-col gap-2.5">
        <span className={`text-[13px] font-bold tracking-[1.5px] ${dark ? "text-lime" : "text-brand"}`}>{label}</span>
        <h3 className="font-display text-[clamp(26px,2.4vw,34px)] leading-[1.1] font-bold tracking-[-0.02em]">{title}</h3>
      </div>
      <ul className={`flex flex-col gap-4 text-[17px] leading-normal ${dark ? "text-fog" : "text-ink-soft"}`}>
        {items.map((item, i) => (
          <li key={item} style={{ "--d": delay + i } as React.CSSProperties} className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className={`pop-in mt-px flex size-7 flex-none items-center justify-center rounded-full ${dark ? "bg-lime text-ink" : "bg-mist text-brand"}`}
            >
              <Icon name="check" size={16} strokeWidth={2.6} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
