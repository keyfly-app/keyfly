import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Tag } from "@/components/ui/Tag";
import type { AccountView } from "@/features/companies/accounts";
import type { LeaseItem } from "./load";

/** One lease as a card (canvas v3 "Most élesíthető"): address, what and where, the other side, rent and term. */
export async function LeaseCard({ item, view }: { item: LeaseItem; view: AccountView }) {
  const [t, p] = await Promise.all([getTranslations("leases"), getTranslations("portal")]);
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] leading-[21px] font-semibold [overflow-wrap:anywhere]">{item.street}</span>
          <span className="text-[13px] leading-[18px] text-muted">
            {item.place} · {t(view === "tenant" ? "party.landlord" : "party.tenant", { name: item.party })}
          </span>
        </span>
        <Tag tone={item.tag.tone}>{item.tag.label}</Tag>
      </span>
      <span className="flex items-center justify-between gap-2 border-t border-paper pt-3 text-[13.5px]">
        <span className="flex min-w-0 flex-col gap-0.5 tabular-nums">
          <span className="font-semibold">
            {item.rent} / {p("perMonth")}
          </span>
          <span className="whitespace-nowrap text-muted">{item.period}</span>
        </span>
        {item.href && <Icon name="chevronRight" size={16} className="flex-none text-muted" />}
      </span>
    </>
  );
  const cls = "flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:p-4.5";
  return item.href ? (
    <Link href={item.href} className={`${cls} transition-colors hover:border-field motion-reduce:transition-none`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Cards in a list. */
export function LeaseCards({ items, view, className = "" }: { items: LeaseItem[]; view: AccountView; className?: string }) {
  return (
    <ul className={`flex flex-col gap-2.5 ${className}`}>
      {items.map((item) => (
        <li key={item.id}>
          <LeaseCard item={item} view={view} />
        </li>
      ))}
    </ul>
  );
}

/** The same leases as a table from 1280 px (canvas v3 "Szerződéseim"); the address opens the lease where there is a page. */
export async function LeaseTable({ items, view, caption, className = "" }: { items: LeaseItem[]; view: AccountView; caption: string; className?: string }) {
  const t = await getTranslations("leases.cols");
  const cols = [t("property"), t(view === "tenant" ? "landlord" : "tenant"), t("rent"), t("term"), t("status")];
  return (
    <div className={`rounded-xl border border-line bg-surface px-3 pt-1 pb-3 ${className}`}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col" className="border-b border-line px-3 py-2.5 text-xs font-semibold text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={item.href ? "relative hover:bg-paper" : undefined}>
              <td className="border-b border-paper p-3">
                <span className="flex flex-col">
                  {item.href ? (
                    <Link href={item.href} className="rounded-sm text-sm font-semibold after:absolute after:inset-0">
                      {item.street}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold">{item.street}</span>
                  )}
                  <span className="text-[12.5px] leading-[17px] text-muted">{item.place}</span>
                </span>
              </td>
              <td className="border-b border-paper p-3 text-[13.5px]">{item.party}</td>
              <td className="border-b border-paper p-3 text-[13.5px] whitespace-nowrap tabular-nums">{item.rent}</td>
              <td className="border-b border-paper p-3 text-[13.5px] whitespace-nowrap text-ink-soft tabular-nums">{item.period}</td>
              <td className="border-b border-paper p-3">
                <Tag tone={item.tag.tone}>{item.tag.label}</Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
