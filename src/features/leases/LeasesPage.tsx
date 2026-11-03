import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ui/form";
import type { AccountSummary, AccountView } from "@/features/companies/accounts";
import { LeaseCards, LeaseTable } from "./LeaseList";
import { leaseItems, type LeasePhase } from "./load";

const FILTERS = ["all", "progress", "recorded"] as const;
type Filter = (typeof FILTERS)[number];
export const readFilter = (raw: string | undefined): Filter => (FILTERS.find((f) => f === raw) ?? "all");

/**
 * "Szerződéseim" / "Szerződések" (canvas v3 "Most élesíthető – új oldal"): the account's leases in its View, filtered
 * by a link per state (works without JavaScript), a table from 1280 px and cards below. `inviteHref`: the tenant's
 * "Bérbeadó meghívása", only where it records for this account.
 */
export async function LeasesPage({
  account,
  view,
  filter,
  listHref,
  inviteHref,
}: {
  account: AccountSummary;
  view: AccountView;
  filter: Filter;
  listHref: string;
  inviteHref?: string;
}) {
  const [t, nav, lr, all] = await Promise.all([getTranslations("leases"), getTranslations("nav"), getTranslations("leaseRequest"), leaseItems(account.id, view)]);
  const who = `${account.kind === "company" ? "company" : "personal"}${view === "tenant" ? "Tenant" : "Landlord"}` as const;
  const items = filter === "all" ? all : all.filter((i) => i.phase === (filter satisfies LeasePhase));
  const title = nav(`leases.${view}`);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[22px] leading-7 font-semibold sm:text-[26px] sm:leading-8">{title}</h1>
          <p className="text-sm text-muted">{t(`lead.${who}`)}</p>
        </div>
        {inviteHref && (
          <ButtonLink href={inviteHref} fit>
            <Icon name="plus" size={16} strokeWidth={2} />
            {lr("inviteLandlord")}
          </ButtonLink>
        )}
      </div>
      {all.length === 0 ? (
        <p className="rounded-xl border border-dashed border-field bg-surface p-5 text-sm text-muted">{t(`empty.${who}`)}</p>
      ) : (
        <>
          <nav aria-label={t("filter.label")} className="sm:w-[360px]">
            <ul className="flex rounded-lg bg-line/60 p-0.5">
              {FILTERS.map((f) => (
                <li key={f} className="flex flex-1">
                  <Link
                    href={f === "all" ? listHref : `${listHref}?filter=${f}`}
                    aria-current={f === filter ? "page" : undefined}
                    className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-2 text-[13px] font-medium lg:min-h-8 ${f === filter ? "bg-surface text-ink shadow-[0_1px_2px_rgb(12_31_25/0.12)]" : "text-muted hover:text-ink"}`}
                  >
                    {t(`filter.${f}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-field bg-surface p-5 text-sm text-muted">{t("filterEmpty")}</p>
          ) : (
            <>
              <LeaseTable items={items} view={view} caption={title} className="hidden xl:block" />
              <LeaseCards items={items} view={view} className="xl:hidden" />
            </>
          )}
        </>
      )}
    </div>
  );
}
