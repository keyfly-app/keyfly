import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { TenantHome, type HomeCard } from "@/features/lease-requests/TenantHome";
import { isLocale } from "@/i18n/config";
import { ADDRESS_COLUMNS, addressFromRow, cityLine, streetLine } from "@/lib/address";
import { date, money } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { rootSegmentTitle } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portal");
  return { title: rootSegmentTitle(t("title")), robots: { index: false } };
}

export default async function PortalHome() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect(await siteHref("portal", "/login"));
  const { data: profile } = await supabase.from("profiles").select("start_view").eq("id", claims.claims.sub).single();
  // First visit: ask how they use Keyfly (sets the start screen only).
  if (!profile?.start_view) redirect(await siteHref("portal", "/welcome"));
  const view = profile.start_view;

  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const t = await getTranslations("portal");
  const status = await getTranslations("status");

  const [{ data: applications }, { data: policies }, { data: requests }] = await Promise.all([
    supabase.from("applications").select("id, status, monthly_rent, deposit_amount, address_text, created_at").order("created_at", { ascending: false }),
    supabase.from("policies").select("id, policy_number, status, coverage_amount, premium_amount, billing_period"),
    view === "tenant"
      ? supabase
          .from("lease_requests")
          .select(
            `id, status, invitation_expires_at, reminder_count, monthly_rent, start_date, end_date, created_at, decided_at, updated_at, ${ADDRESS_COLUMNS}, leases(monthly_rent, start_date, end_date, properties(${ADDRESS_COLUMNS}))`,
          )
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
  ]);
  const lr = await getTranslations("leaseRequest");
  const newRequestHref = await siteHref("portal", "/lease-requests/new");
  const now = new Date();
  const cards: HomeCard[] = await Promise.all(
    (requests ?? []).map(async (r) => {
      // The row carries the latest link's expiry (a reminder replaces the link), readable by every member of the account.
      const expired = r.status === "pending_landlord" && new Date(r.invitation_expires_at) <= now;
      const lease = r.leases;
      const address = lease?.properties ? addressFromRow(lease.properties) : addressFromRow(r);
      const start = lease?.start_date ?? r.start_date;
      const end = lease ? lease.end_date : r.end_date;
      return {
        id: r.id,
        status: expired ? ("expired" as const) : r.status,
        street: streetLine(address),
        city: cityLine(address),
        rent: money(lease?.monthly_rent ?? r.monthly_rent, locale),
        period: `${date(start, locale)} – ${end ? date(end, locale) : lr("terms.openEnded")}`,
        sent: date(r.created_at, locale),
        expires: date(r.invitation_expires_at, locale),
        closed: date(r.decided_at ?? r.updated_at, locale),
        canResend: r.reminder_count < 3,
        href: await siteHref("portal", `/lease-requests/${r.id}`),
      };
    }),
  );
  const tenant = view === "tenant";
  const empty = tenant && cards.length === 0;
  // Live summary under the title (canvas "Fejléc ikonok"): to-dos and invitations still open.
  const todos = cards.filter((c) => c.status === "pending_tenant" || (c.status === "expired" && c.canResend)).length;
  const open = cards.filter((c) => c.status === "pending_landlord" || c.status === "expired" || c.status === "pending_tenant").length;

  return (
    <Shell site="portal">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[22px] leading-7 font-semibold sm:text-[26px] sm:leading-8">{t("title")}</h1>
            <p className="text-sm text-muted">{tenant ? t("summary", { todos, open }) : t(`intro.${view}`)}</p>
          </div>
          {tenant && !empty && (
            <ButtonLink href={newRequestHref} fit>
              <Icon name="plus" size={16} strokeWidth={2} />
              {lr("inviteLandlord")}
            </ButtonLink>
          )}
        </div>

        {tenant && <TenantHome cards={cards} newRequestHref={newRequestHref} />}

        {view === "tenant" && Boolean(applications?.length || policies?.length) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {Boolean(applications?.length) && (
              <section className="rounded-xl border border-line bg-surface px-4.5 py-4">
                <h2 className="text-sm font-semibold">{t("applications")}</h2>
                <ul className="mt-2">
                  {applications?.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 border-t border-paper py-3">
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[13.5px] font-medium">{a.address_text ?? t("addressLater")}</span>
                        <span className="text-[12.5px] text-muted">
                          {t("applicationLine", { rent: money(a.monthly_rent, locale), deposit: money(a.deposit_amount, locale), date: date(a.created_at, locale) })}
                        </span>
                      </span>
                      <Tag tone="neutral">{status(a.status)}</Tag>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {Boolean(policies?.length) && (
              <section className="rounded-xl border border-line bg-surface px-4.5 py-4">
                <h2 className="text-sm font-semibold">{t("policies")}</h2>
                <ul className="mt-2">
                  {policies?.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-4 border-t border-paper py-3">
                      <span className="flex flex-col">
                        <span className="text-[13.5px] font-medium">{p.policy_number}</span>
                        <span className="text-[12.5px] text-muted">{t("coverage", { amount: money(p.coverage_amount, locale) })}</span>
                      </span>
                      <span className="text-[13.5px] font-medium tabular-nums">
                        {money(p.premium_amount, locale)} / {p.billing_period === "monthly" ? t("perMonth") : t("perYear")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
