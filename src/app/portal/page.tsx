import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { myAccounts } from "@/features/companies/accounts";
import { inProgress, isTodo, tenantCards } from "@/features/lease-requests/load";
import { TenantHome } from "@/features/lease-requests/TenantHome";
import { LandlordHome } from "@/features/leases/LandlordHome";
import { leaseItems } from "@/features/leases/load";
import { currentUser } from "@/features/settings/current-user";
import { isLocale } from "@/i18n/config";
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
  const tenant = view === "tenant";
  const me = (await myAccounts()).find((acc) => acc.kind === "person");

  const [{ data: applications }, { data: policies }, cards, lets, user, lr, nav] = await Promise.all([
    supabase.from("applications").select("id, status, monthly_rent, deposit_amount, address_text, created_at").order("created_at", { ascending: false }),
    supabase.from("policies").select("id, policy_number, status, coverage_amount, premium_amount, billing_period"),
    tenant && me ? tenantCards(me.id) : Promise.resolve([]),
    !tenant && me ? leaseItems(me.id, "landlord") : Promise.resolve([]),
    currentUser(),
    getTranslations("leaseRequest"),
    getTranslations("nav"),
  ]);
  const newRequestHref = await siteHref("portal", "/lease-requests/new");
  const empty = tenant && cards.length === 0;
  // Live summary under the title (canvas "Fejléc ikonok"): to-dos and invitations still open.
  const todos = cards.filter(isTodo).length;
  const open = cards.filter(inProgress).length;

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[22px] leading-7 font-semibold sm:text-[26px] sm:leading-8">{t("title")}</h1>
            <p className="text-sm text-muted">{tenant ? t("summary", { todos, open }) : `${user?.fullName ?? user?.email ?? ""} · ${nav("views.landlord")}`}</p>
          </div>
          {tenant && !empty && (
            <ButtonLink href={newRequestHref} fit>
              <Icon name="plus" size={16} strokeWidth={2} />
              {lr("inviteLandlord")}
            </ButtonLink>
          )}
        </div>

        {tenant ? <TenantHome cards={cards} newRequestHref={newRequestHref} /> : <LandlordHome items={lets} />}

        {tenant && Boolean(applications?.length || policies?.length) && (
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
