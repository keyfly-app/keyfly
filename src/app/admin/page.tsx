import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/AdminShell";
import { AuthLayout } from "@/components/AuthLayout";
import { PageTitle } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { isLocale } from "@/i18n/config";
import { date, money } from "@/lib/format";
import { rootSegmentTitle } from "@/lib/metadata";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: rootSegmentTitle(t("overview")), robots: { index: false } };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The request time and the start of the last 7 days (this page is rendered per request). */
function timeframe() {
  const now = new Date();
  return { today: now.toISOString(), weekAgo: new Date(now.getTime() - WEEK_MS).toISOString() };
}

/** Admin overview (App v2.2): four key figures, the latest waitlist sign-ups and quote requests. */
export default async function AdminHome() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect(await siteHref("admin", "/login"));

  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const t = await getTranslations("admin");
  const status = await getTranslations("status");
  const segments = await getTranslations("segments");
  const email = String(claims.claims.email ?? "");

  const [{ data: me }, { data: profile }] = await Promise.all([
    supabase.from("staff").select("role, disabled_at").eq("user_id", claims.claims.sub).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", claims.claims.sub).maybeSingle(),
  ]);
  if (!me || me.disabled_at) {
    return (
      <AuthLayout badge="ADMIN">
        <PageTitle sub={t("noAccessText")}>{t("noAccessTitle")}</PageTitle>
      </AuthLayout>
    );
  }

  const { today, weekAgo } = timeframe();
  const count = (table: "waitlist" | "applications" | "policies" | "claims", since?: string) => {
    const q = supabase.from(table).select("*", { count: "exact", head: true });
    return since ? q.gte("created_at", since) : q;
  };
  const [waitlist, waitlistWeek, apps, appsWeek, pols, clms, { data: latest }, { data: recentApps }] = await Promise.all([
    count("waitlist"),
    count("waitlist", weekAgo),
    count("applications"),
    count("applications", weekAgo),
    count("policies"),
    count("claims"),
    supabase.from("waitlist").select("id, email, segment, marketing_consent, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("applications").select("id, status, monthly_rent, address_text, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  const figures = [
    { key: "waitlist", value: waitlist.count ?? 0, week: waitlistWeek.count ?? 0 },
    { key: "applications", value: apps.count ?? 0, week: appsWeek.count ?? 0 },
    { key: "policies", value: pols.count ?? 0 },
    { key: "claims", value: clms.count ?? 0 },
  ] as const;

  return (
    <AdminShell active="overview" title={t("overview")} user={{ name: profile?.full_name ?? "", email }} superadmin={me.role === "superadmin"}>
      <p className="text-[12.5px] text-muted">{t("todayLine", { date: date(today, locale) })}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {figures.map((f) => (
          <div key={f.key} className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4.5 py-4">
            <span className="text-[12.5px] text-muted">{t(`stats.${f.key}`)}</span>
            <span className="font-display text-[26px] leading-[30px] font-semibold tabular-nums">{f.value.toLocaleString(locale === "hu" ? "hu-HU" : "en-GB")}</span>
            {"week" in f && <span className="text-[12.5px] text-muted">{t("lastWeek", { count: f.week })}</span>}
          </div>
        ))}
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="latest-title" className="overflow-hidden rounded-xl border border-line bg-surface">
          <h2 id="latest-title" className="px-4 py-3.5 text-sm font-semibold">{t("waitlistTitle")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th scope="col" className="h-9 px-4 font-medium">{t("columns.email")}</th>
                  <th scope="col" className="h-9 px-4 font-medium">{t("columns.segment")}</th>
                  <th scope="col" className="h-9 px-4 font-medium">{t("columns.newsletter")}</th>
                  <th scope="col" className="h-9 px-4 font-medium">{t("columns.date")}</th>
                </tr>
              </thead>
              <tbody className="text-[13.5px]">
                {latest?.map((w) => (
                  <tr key={w.id} className="border-b border-paper last:border-0">
                    <td className="h-11 px-4 font-medium">{w.email}</td>
                    <td className="px-4"><Tag tone="neutral">{segments(w.segment)}</Tag></td>
                    <td className="px-4 text-muted">{w.marketing_consent ? t("yes") : t("no")}</td>
                    <td className="px-4 text-muted tabular-nums">{date(w.created_at, locale)}</td>
                  </tr>
                ))}
                {!latest?.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted">{t("waitlistEmpty")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="quotes-title" className="overflow-hidden rounded-xl border border-line bg-surface">
          <h2 id="quotes-title" className="px-4 py-3.5 text-sm font-semibold">{t("recentApplications")}</h2>
          <ul>
            {recentApps?.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-t border-paper px-4 py-3">
                <span className="flex min-w-0 flex-col leading-[18px]">
                  <span className="truncate text-[13.5px] font-medium">{a.address_text ?? money(a.monthly_rent, locale)}</span>
                  <span className="text-[12.5px] text-muted tabular-nums">{date(a.created_at, locale)}</span>
                </span>
                <Tag tone="neutral">{status(a.status)}</Tag>
              </li>
            ))}
            {!recentApps?.length && <li className="border-t border-paper px-4 py-8 text-center text-sm text-muted">{t("applicationsEmpty")}</li>}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
