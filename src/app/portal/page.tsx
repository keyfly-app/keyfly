import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { TextLink } from "@/components/ui/form";
import { isLocale } from "@/i18n/config";
import { date, money } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

  const [{ data: applications }, { data: policies }] = await Promise.all([
    supabase.from("applications").select("id, status, monthly_rent, deposit_amount, address_text, created_at").order("created_at", { ascending: false }),
    supabase.from("policies").select("id, policy_number, status, coverage_amount, premium_amount, billing_period"),
  ]);

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
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
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
