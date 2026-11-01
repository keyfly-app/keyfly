import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { ButtonLink, TextLink } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { Chip, STATUS_TONE } from "@/features/lease-requests/ui";
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
  const { data: profile } = await supabase.from("profiles").select("full_name, email, start_view").eq("id", claims.claims.sub).single();
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
      ? supabase.from("lease_requests").select(`id, status, invitation_expires_at, monthly_rent, start_date, end_date, ${ADDRESS_COLUMNS}`).neq("status", "cancelled")
          .order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: null }),
  ]);
  const lr = await getTranslations("leaseRequest");
  const newRequestHref = await siteHref("portal", "/lease-requests/new");
  const requestCards = await Promise.all(
    (requests ?? []).map(async (r) => {
      // The row carries the latest link's expiry (a reminder replaces the link), readable by every member of the account.
      const expired = r.status === "pending_landlord" && new Date(r.invitation_expires_at) <= new Date();
      const address = addressFromRow(r);
      return {
        id: r.id,
        status: expired ? ("expired" as const) : r.status,
        street: streetLine(address),
        city: cityLine(address),
        rent: money(r.monthly_rent, locale),
        period: r.end_date ? `${date(r.start_date, locale)} – ${date(r.end_date, locale)}` : `${date(r.start_date, locale)} –`,
        href: await siteHref("portal", `/lease-requests/${r.id}`),
      };
    }),
  );

  // Hungarian names are "Family Given": greet with the last word; English with the first.
  const parts = profile.full_name?.trim().split(/\s+/) ?? [];
  const name = (locale === "hu" ? parts.at(-1) : parts[0]) ?? "none";

  return (
    <Shell site="portal">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[26px] leading-8 font-semibold">{t("greeting", { name })}</h1>
            <p className="text-sm text-muted">{t(`intro.${view}`)}</p>
            <TextLink href={await siteHref("portal", "/welcome")}>{t("changeView")}</TextLink>
          </div>
          {view === "tenant" && (
            <div className="w-full sm:w-auto">
              <ButtonLink href={newRequestHref} fit>
                {lr("inviteLandlord")}
              </ButtonLink>
            </div>
          )}
        </div>

        {view === "tenant" && (
          <section aria-labelledby="home-title" className="flex flex-col gap-2.5">
            <h2 id="home-title" className="text-sm font-semibold">{lr("homeTitle")}</h2>
            {requestCards.length ? (
              <ul className="grid gap-3 lg:grid-cols-2">
                {requestCards.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface px-4.5 py-4 transition-colors hover:border-field motion-reduce:transition-none">
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-semibold [overflow-wrap:anywhere]">{c.street}</span>
                          <span className="text-[13px] text-muted">{c.city}</span>
                        </span>
                        <Chip tone={STATUS_TONE[c.status]}>{lr(`status.${c.status}`)}</Chip>
                      </span>
                      <span className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-paper pt-3 text-[13px] text-muted">
                        <span className="font-medium text-ink tabular-nums">
                          {c.rent} / {t("perMonth")}
                        </span>
                        <span className="tabular-nums">{c.period}</span>
                        <Icon name="chevronRight" size={16} className="ml-auto text-muted" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line bg-surface p-5 text-sm text-muted">{lr("homeEmpty")}</p>
            )}
          </section>
        )}

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
