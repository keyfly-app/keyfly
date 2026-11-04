import { getTranslations } from "next-intl/server";
import { Tag, type TagTone } from "@/components/ui/Tag";
import { date, money } from "@/lib/format";
import type { PropertyContext } from "./PropertyFrame";

const TONE: Record<string, TagTone> = {
  draft: "neutral",
  pending: "info",
  confirmed: "ok",
  closed: "neutral",
};

/** "Szerződések" of one property: every lease recorded for it, latest first. */
export async function LeasesTab({ ctx }: { ctx: PropertyContext }) {
  const { property: p, locale } = ctx;
  const [t, o] = await Promise.all([getTranslations("properties.leases"), getTranslations("properties.overview")]);
  const leases = [...p.leases].sort((a, b) => b.start_date.localeCompare(a.start_date));
  if (!leases.length) return <p className="rounded-xl border border-dashed border-field bg-surface p-5 text-sm text-muted">{t("empty")}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {leases.map((l) => {
        const end = [l.end_date, l.termination_date].filter((d): d is string => Boolean(d)).sort()[0];
        const tenant = l.lease_parties.find((x) => x.side === "tenant")?.name ?? o("lease.tenantUnknown");
        return (
          <li key={l.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-semibold [overflow-wrap:anywhere]">{tenant}</span>
              <span className="text-[13px] text-muted tabular-nums">
                {t("period", {
                  start: date(l.start_date, locale),
                  end: end ? date(end, locale) : t("openEnded"),
                })}
              </span>
            </span>
            <span className="flex items-center justify-between gap-4 sm:justify-end">
              <span className="text-sm font-semibold whitespace-nowrap tabular-nums">{o("lease.perMonth", { rent: money(l.monthly_rent, locale) })}</span>
              <Tag tone={TONE[l.status] ?? "neutral"}>{t(`status.${l.status as "draft"}`)}</Tag>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
