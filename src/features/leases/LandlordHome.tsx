import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { LeaseCards } from "./LeaseList";
import type { LeaseItem } from "./load";

/**
 * Landlord Overview of the personal account (canvas v3 "Most élesíthető – bérbeadóként"): the leases recorded with you
 * as landlord, and how a lease gets here – the tenant invites you, you approve by email.
 */
export async function LandlordHome({ items }: { items: LeaseItem[] }) {
  const t = await getTranslations("leases.home");
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="lets-title" className="flex min-w-0 flex-col gap-2.5">
        <h2 id="lets-title" className="text-[15px] leading-5 font-semibold">
          {t("title")}
        </h2>
        {items.length ? (
          <LeaseCards items={items} view="landlord" />
        ) : (
          <p className="rounded-xl border border-dashed border-field bg-surface p-5 text-sm text-muted">{t("empty")}</p>
        )}
      </section>
      <section aria-labelledby="how-title" className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-5 lg:mt-[30px]">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-lg bg-mist text-brand">
            <Icon name="mail" size={16} />
          </span>
          <h2 id="how-title" className="text-[15px] leading-5 font-semibold">
            {t("howTitle")}
          </h2>
        </div>
        <p className="text-[13.5px] leading-5 text-muted">{t("howText")}</p>
      </section>
    </div>
  );
}
