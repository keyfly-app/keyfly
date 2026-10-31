import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/Icon";

const TENANT_ITEMS = ["upfront", "savings", "online"] as const;
const LANDLORD_ITEMS = ["cover", "admin", "free"] as const;

/** Why Keyfly works for tenants and for landlords. */
export async function AudienceSection() {
  const t = await getTranslations("comingSoon.audience");

  return (
    <section aria-labelledby="audience-title" className="border-t border-line bg-surface py-[clamp(72px,9vw,128px)]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 sm:gap-14 sm:px-6">
        <div className="reveal flex max-w-[760px] flex-col gap-4">
          <span className="text-[13px] font-bold tracking-[1.5px] text-brand">{t("eyebrow")}</span>
          <h2 id="audience-title" className="font-display text-[clamp(34px,4.4vw,60px)] leading-[1.04] font-bold tracking-[-0.03em]">
            {t("title")}
          </h2>
          <p className="text-[clamp(18px,1.6vw,22px)] leading-normal text-muted">{t("lead")}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-6">
          <Card
            icon="wallet"
            label={t("tenant.label")}
            title={t("tenant.title")}
            items={TENANT_ITEMS.map((k) => t(`tenant.items.${k}`))}
          />
          <Card
            icon="shield"
            label={t("landlord.label")}
            title={t("landlord.title")}
            items={LANDLORD_ITEMS.map((k) => t(`landlord.items.${k}`))}
            dark
          />
        </div>
      </div>
    </section>
  );
}

function Card({ icon, label, title, items, dark = false }: { icon: IconName; label: string; title: string; items: string[]; dark?: boolean }) {
  return (
    <article
      className={`reveal flex flex-col gap-6 rounded-[32px] p-7 transition-transform duration-300 ease-out hover:-translate-y-1 sm:p-12 ${
        dark ? "on-dark bg-ink text-white" : "border border-line bg-paper"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-15 items-center justify-center rounded-[18px] ${dark ? "bg-lime/14 text-lime" : "bg-mist text-brand"}`}
      >
        <Icon name={icon} size={30} />
      </span>
      <div className="flex flex-col gap-2.5">
        <span className={`text-[13px] font-bold tracking-[1.5px] ${dark ? "text-lime" : "text-brand"}`}>{label}</span>
        <h3 className="font-display text-[clamp(26px,2.4vw,34px)] leading-[1.1] font-bold tracking-[-0.02em]">{title}</h3>
      </div>
      <ul className={`flex flex-col gap-4 text-[17px] leading-normal ${dark ? "text-fog" : "text-ink-soft"}`}>
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className={`mt-px flex size-7 flex-none items-center justify-center rounded-full ${dark ? "bg-lime text-ink" : "bg-mist text-brand"}`}
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
