import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Shell } from "@/components/Shell";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink, Notice } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { Timeline, type TimelineItem } from "@/components/ui/Timeline";
import { initialsOf } from "@/features/settings/current-user";
import { isLocale, type Locale } from "@/i18n/config";
import { addressFromRow, cityLine, streetLine, type AddressRow } from "@/lib/address";
import { date, dateTime, money, until } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { ReconfirmActions, RemindButton, RevokeButton } from "./TenantActions";
import { KeyValues, STATUS_TONE } from "./ui";

const MAX_REMINDERS = 3;
const REMINDER_GAP_MS = 24 * 60 * 60 * 1000;

/** The lease the landlord created when taking the request over (their terms). */
export type TakenOverLease = Pick<
  Tables<"leases">,
  "start_date" | "end_date" | "monthly_rent" | "deposit_amount" | "payment_day" | "created_at" | "landlord_confirmed_at"
> & { properties: (AddressRow & { kind: Enums<"property_kind"> }) | null };

type Change = "changed" | "added" | null;

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4.5 sm:gap-4 sm:p-6">
      <div className="flex items-center gap-2.5">
        <h2 className="text-[15px] leading-5 font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * Tenant side of one lease request (canvas "App v2.3"): status page in the app shell with a timeline, the terms and the
 * landlord. States: waiting for the landlord (remind, withdraw), expired (send again), the landlord's changed terms
 * (comparison, accept or decline), recorded, declined or withdrawn.
 */
export async function LeaseRequestStatus({
  request: r,
  lease,
  canAct,
  sent,
  reminded,
  now = new Date(),
}: {
  request: Tables<"lease_requests">;
  lease: TakenOverLease | null;
  canAct: boolean;
  sent?: boolean;
  reminded?: boolean;
  now?: Date;
}) {
  const [t, kinds] = await Promise.all([getTranslations("leaseRequest"), getTranslations("propertyKinds")]);
  const raw = await getLocale();
  const locale: Locale = isLocale(raw) ? raw : "hu";
  const place = lease?.properties ? addressFromRow(lease.properties) : addressFromRow(r);
  // The row carries the latest link's expiry: after a reminder the old link is replaced, not expired.
  const expired = r.status === "pending_landlord" && new Date(r.invitation_expires_at) <= now;
  const status = expired ? "expired" : r.status;
  const landlord = r.landlord_name ?? r.landlord_email;
  const [home, newRequest] = await Promise.all([siteHref("portal", "/"), siteHref("portal", "/lease-requests/new")]);
  const end = (iso: string | null) => (iso ? date(iso, locale) : t("terms.openEnded"));
  const remindersLeft = r.reminder_count < MAX_REMINDERS;
  const nextReminderAt = new Date(new Date(r.last_sent_at).getTime() + REMINDER_GAP_MS);
  const waitUntil = nextReminderAt > now ? t("page.nextReminder", { time: dateTime(nextReminderAt.toISOString(), locale) }) : undefined;

  const sentStep: TimelineItem = { state: "done", title: t("timeline.sent"), sub: t("timeline.sentSub", { time: dateTime(r.created_at, locale), email: r.landlord_email }) };
  const recordedTodo: TimelineItem = { state: "todo", title: t("timeline.recorded"), sub: status === "pending_landlord" || status === "pending_tenant" ? t("timeline.recordedSub") : undefined };
  const requestTerms: [string, string][] = [
    [t("rows.rent"), money(r.monthly_rent, locale)],
    ...(r.deposit_amount != null ? [[t("rows.deposit"), money(r.deposit_amount, locale)] as [string, string]] : []),
    [t("rows.start"), date(r.start_date, locale)],
    r.end_date ? [t("rows.end"), date(r.end_date, locale)] : [t("rows.term"), t("terms.openEnded")],
  ];

  // Landlord's changes against what the tenant entered.
  const comparison: [string, string, string, Change][] = [];
  if (lease) {
    const add = (label: string, mine: string | null, theirs: string, same: boolean) =>
      comparison.push([label, mine ?? t("reconfirm.none"), theirs, same ? null : mine == null ? "added" : "changed"]);
    add(t("rows.rent"), money(r.monthly_rent, locale), money(lease.monthly_rent, locale), lease.monthly_rent === r.monthly_rent);
    if (lease.deposit_amount != null || r.deposit_amount != null)
      add(t("rows.deposit"), r.deposit_amount == null ? null : money(r.deposit_amount, locale), money(lease.deposit_amount, locale), lease.deposit_amount === r.deposit_amount);
    add(t("rows.start"), date(r.start_date, locale), date(lease.start_date, locale), lease.start_date === r.start_date);
    add(t("rows.end"), end(r.end_date), end(lease.end_date), lease.end_date === r.end_date);
    if (lease.payment_day) add(t("rows.paymentDay"), null, t("paymentDayValue", { day: lease.payment_day }), false);
  }
  const changes = comparison.filter(([, , , c]) => c).length;

  let timeline: TimelineItem[];
  let notice: React.ReactNode = null;
  if (status === "pending_landlord") {
    timeline = [sentStep, { state: "now", title: t("timeline.waiting"), sub: t("timeline.waitingSub", { until: until(r.invitation_expires_at, locale) }) }, recordedTodo];
    if (sent || reminded) notice = <Notice kind="success">{sent ? t("page.sent", { name: landlord }) : t("page.reminded")}</Notice>;
  } else if (status === "expired") {
    timeline = [sentStep, { state: "err", title: t("timeline.expired"), sub: t("timeline.expiredSub", { date: date(r.invitation_expires_at, locale) }) }, recordedTodo];
    notice = (
      <Notice kind="error" icon="clock">
        {remindersLeft ? t("expired.note", { date: date(r.invitation_expires_at, locale), name: landlord }) : t("expired.limit")}
      </Notice>
    );
  } else if (status === "pending_tenant" && lease) {
    timeline = [
      sentStep,
      { state: "done", title: t("timeline.changed"), sub: t("timeline.changedSub", { date: date(lease.created_at, locale), count: changes }) },
      { state: "now", title: t("timeline.yours"), sub: t("timeline.yoursSub") },
      recordedTodo,
    ];
    notice = <Notice kind="warning">{t("reconfirm.banner", { name: landlord })}</Notice>;
  } else if (status === "confirmed") {
    timeline = [
      sentStep,
      { state: "done", title: t("timeline.approved"), sub: date(lease?.landlord_confirmed_at ?? r.decided_at, locale) },
      { state: "done", title: t("timeline.recorded"), sub: date(r.decided_at ?? lease?.created_at, locale) },
    ];
  } else {
    const kind = status === "declined" ? "declined" : r.lease_id ? "termsDeclined" : "cancelled";
    timeline = [
      sentStep,
      ...(lease ? [{ state: "done", title: t("timeline.changed"), sub: date(lease.created_at, locale) } as TimelineItem] : []),
      { state: "err", title: t(`timeline.${kind}`), sub: date(r.decided_at ?? r.updated_at, locale) },
      recordedTodo,
    ];
    notice = <Notice kind={status === "declined" ? "warning" : "info"} icon="info">{t(`outcome.${kind}`, { name: landlord })}</Notice>;
  }

  const open = status === "pending_landlord" || status === "expired";
  const landlordCard = (
    <Card title={t("page.landlordTitle")}>
      <div className="flex items-center gap-3">
        <Avatar src={null} initials={initialsOf(r.landlord_name, r.landlord_email)} size={36} />
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold [overflow-wrap:anywhere]">{r.landlord_name ?? r.landlord_email}</span>
          {r.landlord_name && <span className="text-[13px] text-muted [overflow-wrap:anywhere]">{r.landlord_email}</span>}
        </span>
      </div>
      {open && (
        <KeyValues
          rows={[
            [t("page.sentAt"), date(r.last_sent_at, locale)],
            [t("page.valid"), expired ? t("status.expired") : until(r.invitation_expires_at, locale)],
            [t("page.reminders"), t("page.remindersValue", { count: r.reminder_count })],
          ]}
        />
      )}
      {open && canAct && (
        <div className="hidden border-t border-paper pt-1 sm:block">
          <RevokeButton requestId={r.id} landlord={landlord} />
        </div>
      )}
    </Card>
  );

  // Primary action of the page: in the header from 640 px, in the sticky bar on phones.
  const action = (full: boolean) => {
    if (!canAct) return null;
    if (status === "pending_landlord" && remindersLeft)
      return <RemindButton requestId={r.id} label={t("page.remind")} icon="bell" full={full} waitUntil={waitUntil} />;
    if (status === "expired" && remindersLeft) return <RemindButton requestId={r.id} label={t("expired.resend")} icon="send" primary full={full} />;
    if (status === "declined" || status === "cancelled")
      return (
        <ButtonLink href={newRequest} fit={!full}>
          <Icon name="plus" size={16} strokeWidth={2} />
          {t("page.newInvite")}
        </ButtonLink>
      );
    return null;
  };
  const headerAction = action(false);
  const barAction = action(true);
  const bar =
    status === "pending_tenant" && lease && canAct ? (
      <>
        <p className="text-center text-[12.5px] leading-[18px] text-muted">{t("reconfirm.declineNote")}</p>
        <ReconfirmActions requestId={r.id} stacked />
      </>
    ) : barAction || (open && canAct) ? (
      <>
        {status === "pending_landlord" && remindersLeft && <p className="text-center text-[12.5px] leading-[18px] text-muted">{waitUntil ?? t("page.remindHint")}</p>}
        {barAction}
        {open && <RevokeButton requestId={r.id} landlord={landlord} full />}
      </>
    ) : null;

  return (
    <Shell site="portal">
      <div className="flex flex-col gap-5">
        <nav aria-label={t("page.crumbs")}>
          <ol className="hidden items-center gap-1.5 text-[13px] text-muted sm:flex">
            <li>
              <Link href={home} className="hover:text-ink hover:underline">
                {t("page.home")}
              </Link>
            </li>
            <li aria-hidden="true">
              <Icon name="chevronRight" size={14} />
            </li>
            <li aria-current="page" className="truncate font-medium text-ink">
              {streetLine(place)}
            </li>
          </ol>
          <Link href={home} className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-[13px] font-medium sm:hidden">
            <Icon name="back" size={16} strokeWidth={2} />
            {t("page.home")}
          </Link>
        </nav>

        {notice}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{t("page.label")}</p>
            <h1 className="font-display text-[20px] leading-[26px] font-semibold [overflow-wrap:anywhere] sm:text-2xl sm:leading-[30px]">{streetLine(place)}</h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm text-muted">{`${kinds(lease?.properties?.kind ?? r.property_kind)} · ${cityLine(place)}`}</span>
              <Tag tone={STATUS_TONE[status]}>{t(`status.${status}`)}</Tag>
            </div>
          </div>
          {headerAction && <div className="hidden flex-none sm:block">{headerAction}</div>}
        </div>

        <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            {status === "pending_tenant" && lease ? (
              <Card title={t("reconfirm.title")} aside={changes > 0 && <Tag tone="warning">{t("reconfirm.changes", { count: changes })}</Tag>}>
                <table className="hidden w-full border-separate border-spacing-0 overflow-hidden rounded-[10px] border border-line text-sm sm:table">
                  <thead>
                    <tr>
                      {[t("reconfirm.colTerm"), t("reconfirm.colYours"), t("reconfirm.colTheirs")].map((c) => (
                        <th key={c} scope="col" className="border-b border-line bg-paper px-4 py-2.5 text-left text-xs font-semibold text-muted">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map(([label, mine, theirs, change], i) => {
                      const line = i < comparison.length - 1 ? "border-b border-paper" : "";
                      return (
                        <tr key={label}>
                          <th scope="row" className={`px-4 py-3 text-left font-normal text-muted ${line}`}>
                            {label}
                          </th>
                          <td className={`px-4 py-3 tabular-nums ${change ? "text-muted" : ""} ${line}`}>{change === "changed" ? <del>{mine}</del> : mine}</td>
                          <td className={`px-4 py-3 tabular-nums ${change ? "bg-warning-soft/40 font-semibold" : "font-medium"} ${line}`}>
                            <span className="flex flex-wrap items-center gap-2">
                              {theirs}
                              {change && <Tag tone={change === "changed" ? "warning" : "info"}>{t(`reconfirm.${change}`)}</Tag>}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="sm:hidden">
                  <KeyValues
                    rows={comparison.map(([label, mine, theirs, change]) => [
                      label,
                      <span key={label} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        {change === "changed" && <del className="font-normal text-muted">{mine}</del>}
                        <span className={change ? "font-semibold" : ""}>{theirs}</span>
                        {change && <Tag tone={change === "changed" ? "warning" : "info"}>{t(`reconfirm.${change}`)}</Tag>}
                      </span>,
                    ])}
                  />
                </div>
                {canAct ? (
                  <div className="hidden items-center justify-between gap-4 border-t border-paper pt-4 sm:flex">
                    <p className="max-w-[340px] text-[12.5px] leading-[18px] text-muted">{t("reconfirm.declineNote")}</p>
                    <ReconfirmActions requestId={r.id} />
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">{t("page.readOnly")}</p>
                )}
              </Card>
            ) : (
              <>
                {status === "confirmed" && lease ? (
                  <Card title={t("page.termsTitle")}>
                    <KeyValues
                      rows={[
                        [t("rows.rent"), money(lease.monthly_rent, locale)],
                        ...(lease.deposit_amount != null ? [[t("rows.deposit"), money(lease.deposit_amount, locale)] as [string, string]] : []),
                        ...(lease.payment_day ? [[t("rows.paymentDay"), t("paymentDayValue", { day: lease.payment_day })] as [string, string]] : []),
                        [t("rows.term"), `${date(lease.start_date, locale)} – ${end(lease.end_date)}`],
                      ]}
                    />
                  </Card>
                ) : null}
                <Card title={t("page.statusTitle")}>
                  <Timeline items={timeline} />
                </Card>
                {status !== "confirmed" && (
                  <Card title={t("page.termsTitle")}>
                    <KeyValues rows={requestTerms} />
                  </Card>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {status === "pending_tenant" && (
              <Card title={t("page.statusTitle")}>
                <Timeline items={timeline} />
              </Card>
            )}
            {landlordCard}
            {open && canAct && status === "pending_landlord" && remindersLeft && (
              <p className="hidden px-1 text-[12.5px] leading-[18px] text-muted sm:block">{waitUntil ?? t("page.remindHint")}</p>
            )}
            {!canAct && open && <p className="px-1 text-[12.5px] leading-[18px] text-muted">{t("page.readOnly")}</p>}
          </div>
        </div>
      </div>

      {bar && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 -mb-6 flex flex-col gap-2 border-t border-line bg-surface px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:hidden">
          {bar}
        </div>
      )}
    </Shell>
  );
}

