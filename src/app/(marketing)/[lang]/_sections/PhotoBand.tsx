import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AiImageBadge } from "@/components/site/AiImageBadge";
import { PHOTOS } from "@/content/photos";

/** Full-width campaign photo with the key message, right below the hero. */
export async function PhotoBand() {
  const t = await getTranslations("comingSoon.band");

  return (
    <section aria-labelledby="band-title" className="pb-[clamp(56px,7vw,96px)]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <figure
          data-reveal
          className="relative h-[600px] overflow-hidden rounded-[32px] bg-ink sm:h-[clamp(440px,44vw,600px)]"
        >
          <Image
            src={PHOTOS.moveIn.src}
            alt={t("alt")}
            fill
            sizes="(max-width: 1248px) 100vw, 1200px"
            placeholder="blur"
            className={`photo-zoom object-cover ${PHOTOS.moveIn.focus}`}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-ink/92 via-ink/70 via-40% to-ink/0 to-68% sm:bg-linear-to-r sm:from-ink/88 sm:via-ink/64 sm:via-38% sm:to-64%"
          />
          <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-3.5 p-6 text-white sm:inset-y-0 sm:w-[min(600px,54%)] sm:justify-center sm:gap-5 sm:p-[clamp(28px,4.4vw,72px)]">
            <span className="line-in self-start rounded-full bg-lime/16 px-3.5 py-2 text-[13px] font-bold tracking-[1.5px] text-lime">
              {t("eyebrow")}
            </span>
            <h2
              id="band-title"
              className="font-display text-[clamp(40px,5.2vw,76px)] leading-[1.02] font-bold tracking-[-0.035em]"
            >
              <span className="line-in block" style={{ "--d": 1 } as React.CSSProperties}>
                {t("line1")}
              </span>
              <span className="line-in block text-lime" style={{ "--d": 2 } as React.CSSProperties}>
                <span className="underline-in">{t("line2")}</span>
              </span>
            </h2>
            <p
              className="line-in max-w-[440px] text-[clamp(18px,1.6vw,22px)] leading-normal text-fog"
              style={{ "--d": 3 } as React.CSSProperties}
            >
              {t("lead")}
            </p>
          </figcaption>
          <AiImageBadge />
        </figure>
      </div>
    </section>
  );
}
