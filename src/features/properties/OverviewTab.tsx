import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { accountInitials } from "@/features/companies/accounts";
import { date, money } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { featureFacts } from "./facts";
import { fieldsOf } from "./kinds";
import { responsibleOptions } from "./load";
import type { PropertyContext } from "./PropertyFrame";

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 className="text-[15px] leading-5 font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const linkCls = "inline-flex min-h-11 items-center gap-1 text-[13.5px] font-semibold text-brand hover:underline sm:min-h-6";

/**
 * "Áttekintés" (canvas "Ingatlan – áttekintés"): the current lease and the features on the left; what is still missing
 * and who looks after it on the right. Services and contacts join when those modules ship.
 */
export async function OverviewTab({ ctx }: { ctx: PropertyContext }) {
  const { property: p, locale, root, editable, account, catalog } = ctx;
  const [t, lt, d] = await Promise.all([getTranslations("properties.overview"), getTranslations("properties.leases"), getTranslations("properties.data")]);
  const [facts, leasesHref, featuresHref] = await Promise.all([
    featureFacts(ctx),
    siteHref("portal", `${root}/leases`),
    siteHref("portal", `${root}/data?edit=features`),
  ]);
  const o = p.occupancy;
  const lease = o.state === "vacant" ? null : p.leases.find((l) => l.id === o.leaseId);
  const company = account.kind === "company";
  const team = company ? await responsibleOptions(account.id) : [];
  const responsible = team.find((m) => m.id === p.property_management?.responsible_user_id)?.name ?? null;

  // What is still missing: the features the type asks for, the land registry number and – in a company – who is responsible.
  const fields = fieldsOf(catalog.property_type, p.kind);
  const checks: { label: string; done: boolean; section: string }[] = [
    { label: d("features.area"), done: p.area_m2 != null, section: "features" },
    ...(fields.has("rooms")
      ? [
          {
            label: d("features.rooms"),
            done: p.rooms != null || p.half_rooms != null,
            section: "features",
          },
        ]
      : []),
    ...(fields.has("heating")
      ? [
          {
            label: d("features.heating"),
            done: Boolean(p.heating),
            section: "features",
          },
        ]
      : []),
    ...(fields.has("energy_rating")
      ? [
          {
            label: d("features.energy"),
            done: Boolean(p.energy_rating),
            section: "features",
          },
        ]
      : []),
    {
      label: d("features.builtYear"),
      done: p.built_year != null,
      section: "features",
    },
    {
      label: d("address.parcel"),
      done: Boolean(p.parcel_number),
      section: "address",
    },
    ...(company
      ? [
          {
            label: d("management.responsible"),
            done: Boolean(responsible),
            section: "management",
          },
        ]
      : []),
  ];
  const done = checks.filter((c) => c.done).length;
  const missing = await Promise.all(
    checks
      .filter((c) => !c.done)
      .map(async (c) => ({
        ...c,
        href: await siteHref("portal", `${root}/data?edit=${c.section}`),
      })),
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4">
        <Card
          title={t("lease.title")}
          action={lease && <Tag tone={lease.status === "confirmed" ? "ok" : "info"}>{lt(`status.${lease.status as "confirmed"}`)}</Tag>}
        >
          {lease && o.state !== "vacant" ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar initials={accountInitials(o.tenant ?? t("lease.tenantUnknown"))} size={40} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-semibold [overflow-wrap:anywhere]">{o.tenant ?? t("lease.tenantUnknown")}</span>
                    <span className="text-[13px] text-muted tabular-nums">
                      {lt("period", {
                        start: date(o.start, locale),
                        end: o.end ? date(o.end, locale) : lt("openEnded"),
                      })}
                    </span>
                  </span>
                </span>
                <span className="text-[15px] font-semibold whitespace-nowrap tabular-nums">{t("lease.perMonth", { rent: money(o.rent, locale) })}</span>
              </div>
              <Link href={leasesHref} className={`${linkCls} self-start border-t border-paper pt-3`}>
                {t("lease.open")}
                <Icon name="chevronRight" size={14} strokeWidth={2.25} />
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted">{t("lease.none")}</p>
          )}
        </Card>

        <Card
          title={d("features.title")}
          action={
            editable && (
              <Link href={featuresHref} className={linkCls}>
                {t("edit")}
              </Link>
            )
          }
        >
          <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.key} className="flex min-w-0 flex-col gap-0.5 border-t border-paper py-3">
                <dt className="text-[12.5px] text-muted">{f.label}</dt>
                <dd className="text-sm font-semibold [overflow-wrap:anywhere]">{f.value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {editable && missing.length > 0 && (
          <Card
            title={t("completion.title")}
            action={<span className="text-[13px] font-semibold text-muted tabular-nums">{t("completion.progress", { done, total: checks.length })}</span>}
          >
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={checks.length}
              aria-valuenow={done}
              aria-label={t("completion.progressLabel", {
                done,
                total: checks.length,
              })}
              className="h-1.5 overflow-hidden rounded-full bg-paper"
            >
              <span
                className="block h-full rounded-full bg-brand"
                style={{
                  width: `${Math.round((done / checks.length) * 100)}%`,
                }}
              />
            </div>
            <ul className="flex flex-col">
              {missing.map((m) => (
                <li key={m.label}>
                  <Link href={m.href} className={`${linkCls} gap-2`}>
                    <Icon name="plus" size={15} strokeWidth={2.25} />
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {company && (
          <Card title={d("management.title")}>
            <dl className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-muted">{d("management.responsible")}</dt>
              <dd className="text-right font-semibold [overflow-wrap:anywhere]">{responsible ?? d("management.nobody")}</dd>
            </dl>
          </Card>
        )}
      </div>
    </div>
  );
}
