import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Notice } from "@/components/ui/form";
import { ReconfirmActions, WaitingActions } from "@/features/lease-requests/TenantActions";
import { Changed, Chip, DetailRows, STATUS_TONE } from "@/features/lease-requests/ui";
import { isLocale } from "@/i18n/config";
import { ADDRESS_COLUMNS, addressFromRow, cityLine, streetLine } from "@/lib/address";
import { date, money } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaseRequest");
  return { title: t("card.label"), robots: { index: false } };
}

/** Tenant side of one lease request: waiting for the landlord (step 4), approving changed terms (step 7), or the outcome. */
export default async function LeaseRequest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await getTranslations("leaseRequest");
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const supabase = await createClient();

  const { data: r } = await supabase.from("lease_requests").select(`*`).eq("id", id).maybeSingle();
  if (!r) notFound();
  const [{ data: invitation }, { data: lease }] = await Promise.all([
    supabase.from("invitations").select("expires_at").eq("lease_request_id", id).is("revoked_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    r.lease_id
      ? supabase.from("leases").select(`start_date, end_date, monthly_rent, deposit_amount, payment_day, properties(${ADDRESS_COLUMNS})`).eq("id", r.lease_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const requested = addressFromRow(r);
  const place = lease?.properties ? addressFromRow(lease.properties) : requested;
  const expired = r.status === "pending_landlord" && (!invitation || new Date(invitation.expires_at) <= new Date());
  const status = expired ? "expired" : r.status;
  const landlord = r.landlord_name ?? r.landlord_email;
  const back = { href: await siteHref("portal", "/"), label: t("homeTitle") };
  const end = (iso: string | null) => (iso ? date(iso, locale) : t("terms.openEnded"));

  if (r.status === "pending_tenant" && lease) {
    const items: [string, React.ReactNode][] = [[t("rows.property"), streetLine(place)]];
    const row = (label: string, before: string | null, after: string, changed: boolean) =>
      items.push([label, changed ? <Changed key={label} before={before ?? undefined} after={after} label={before ? t("reconfirm.changed") : t("reconfirm.added")} /> : after]);
    row(t("rows.rent"), money(r.monthly_rent, locale), money(lease.monthly_rent, locale), lease.monthly_rent !== r.monthly_rent);
    row(t("rows.start"), date(r.start_date, locale), date(lease.start_date, locale), lease.start_date !== r.start_date);
    row(t("rows.end"), end(r.end_date), end(lease.end_date), lease.end_date !== r.end_date);
    if (lease.deposit_amount != null || r.deposit_amount != null)
      row(t("rows.deposit"), r.deposit_amount == null ? null : money(r.deposit_amount, locale), money(lease.deposit_amount, locale), lease.deposit_amount !== r.deposit_amount);
    if (lease.payment_day) row(t("rows.paymentDay"), null, t("paymentDayValue", { day: lease.payment_day }), true);
    return (
      <AuthLayout back={back}>
        <Notice kind="warning">{t("reconfirm.banner")}</Notice>
        <h1 className="font-display text-[26px] leading-tight font-semibold">{t("reconfirm.title")}</h1>
        <p className="text-[15px] text-muted">{t("reconfirm.lead", { name: landlord })}</p>
        <DetailRows rows={items} />
        <ReconfirmActions requestId={r.id} />
      </AuthLayout>
    );
  }

  const rows: [string, React.ReactNode][] =
    r.status === "confirmed" && lease
      ? [
          [t("rows.rent"), money(lease.monthly_rent, locale)],
          [t("rows.start"), date(lease.start_date, locale)],
          [t("rows.end"), end(lease.end_date)],
          [t("rows.landlord"), landlord],
        ]
      : [
          [t("rows.landlord"), r.landlord_email],
          [t("rows.sent"), date(r.last_sent_at, locale)],
          ...(r.status === "pending_landlord" && invitation ? [[t("rows.expires"), date(invitation.expires_at, locale)] as [string, string]] : []),
        ];
  const text =
    r.status === "pending_landlord" ? t(expired ? "waiting.expiredText" : "waiting.text") : t(`outcome.${r.status as "confirmed" | "declined" | "cancelled"}`);

  return (
    <AuthLayout back={back}>
      {sent && r.status === "pending_landlord" && <Notice kind="success">{t("waiting.sent")}</Notice>}
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{t("card.label")}</p>
            <h1 className="font-display text-[19px] leading-snug font-semibold">{streetLine(place)}</h1>
            <p className="text-[13px] text-muted">{cityLine(place)}</p>
          </div>
          <Chip tone={STATUS_TONE[status]}>{t(`status.${status}`)}</Chip>
        </div>
        <DetailRows rows={rows} />
        <p className="text-sm text-muted">{text}</p>
        {r.status === "pending_landlord" && <WaitingActions requestId={r.id} canRemind={r.reminder_count < 3} />}
      </section>
    </AuthLayout>
  );
}
