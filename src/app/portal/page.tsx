import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { TextLink } from "@/components/ui/form";
import { Chip, STATUS_TONE } from "@/features/lease-requests/ui";
import { isLocale } from "@/i18n/config";
import { ADDRESS_COLUMNS, addressFromRow, streetLine } from "@/lib/address";
import { date, money } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("portal");
  return { title: t("title"), robots: { index: false } };
}

export default async function PortalHome() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect(await siteHref("portal", "/login"));
  const { data: profile } = await supabase.from("profiles").select("full_name, email, start_view").single();
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
      ? supabase.from("lease_requests").select(`id, status, invitation_expires_at, ${ADDRESS_COLUMNS}`).neq("status", "cancelled")
          .order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: null }),
  ]);
  const lr = await getTranslations("leaseRequest");
  const newRequestHref = await siteHref("portal", "/lease-requests/new");
  const requestCards = await Promise.all(
    (requests ?? []).map(async (r) => {
      // The row carries the latest link's expiry (a reminder replaces the link), readable by every member of the account.
      const expired = r.status === "pending_landlord" && new Date(r.invitation_expires_at) <= new Date();
      return { id: r.id, status: expired ? ("expired" as const) : r.status, address: streetLine(addressFromRow(r)), href: await siteHref("portal", `/lease-requests/${r.id}`) };
    }),
  );

  // Hungarian names are "Family Given": greet with the last word; English with the first.
  const parts = profile.full_name?.trim().split(/\s+/) ?? [];
  const name = (locale === "hu" ? parts.at(-1) : parts[0]) ?? "none";

  return (
    <Shell site="portal" email={profile.email}>
      <h1 className="font-display text-4xl font-bold">{t("greeting", { name })}</h1>
      <p className="mt-2 text-muted">{t(`intro.${view}`)}</p>
      <p className="mt-1">
        <TextLink href={await siteHref("portal", "/welcome")}>{t("changeView")}</TextLink>
      </p>

      {view === "tenant" && (
        <section aria-labelledby="home-title" className="mt-8 rounded-3xl bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="home-title" className="font-display text-xl font-bold">{lr("homeTitle")}</h2>
            <Link href={newRequestHref} className="inline-flex h-11 items-center rounded-full border border-field bg-surface px-4.5 text-sm font-semibold hover:border-brand">
              {lr("inviteLandlord")}
            </Link>
          </div>
          {requestCards.length ? (
            <ul className="mt-4 divide-y divide-line">
              {requestCards.map((c) => (
                <li key={c.id}>
                  <Link href={c.href} className="flex min-h-14 items-center justify-between gap-4 py-3 hover:text-brand">
                    <span className="min-w-0 font-semibold">{c.address}</span>
                    <Chip tone={STATUS_TONE[c.status]}>{lr(`status.${c.status}`)}</Chip>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-paper p-5 text-muted">{lr("homeEmpty")}</p>
          )}
        </section>
      )}

      {view === "tenant" && (
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6">
          <h2 className="font-display text-xl font-bold">{t("applications")}</h2>
          {applications?.length ? (
            <ul className="mt-4 divide-y divide-line">
              {applications.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold">{a.address_text ?? t("addressLater")}</p>
                    <p className="text-sm text-muted">
                      {t("applicationLine", { rent: money(a.monthly_rent, locale), deposit: money(a.deposit_amount, locale), date: date(a.created_at, locale) })}
                    </p>
                  </div>
                  <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold text-brand">{status(a.status)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-paper p-5 text-muted">{t("noApplications")}</p>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6">
          <h2 className="font-display text-xl font-bold">{t("policies")}</h2>
          {policies?.length ? (
            <ul className="mt-4 divide-y divide-line">
              {policies.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{p.policy_number}</p>
                    <p className="text-sm text-muted">{t("coverage", { amount: money(p.coverage_amount, locale) })}</p>
                  </div>
                  <span className="text-sm font-semibold">
                    {money(p.premium_amount, locale)} / {p.billing_period === "monthly" ? t("perMonth") : t("perYear")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-paper p-5 text-muted">{t("noPolicies")}</p>
          )}
        </div>
      </section>
      )}
    </Shell>
  );
}
