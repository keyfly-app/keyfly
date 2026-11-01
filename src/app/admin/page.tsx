import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { TextLink } from "@/components/ui/form";
import { isLocale } from "@/i18n/config";
import { date } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect(await siteHref("admin", "/login"));

  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const t = await getTranslations("admin");
  const status = await getTranslations("status");
  const segments = await getTranslations("segments");
  const staffT = await getTranslations("adminStaff");
  const email = claims.claims.email as string | undefined;

  const { data: me } = await supabase.from("staff").select("role, disabled_at").eq("user_id", claims.claims.sub).maybeSingle();
  if (!me || me.disabled_at) {
    return (
      <Shell site="admin" badge="ADMIN" email={email}>
        <div className="mx-auto mt-6 max-w-md rounded-3xl bg-white p-7">
          <h1 className="font-display text-2xl font-bold">{t("noAccessTitle")}</h1>
          <p className="mt-2 text-muted">{t("noAccessText")}</p>
        </div>
      </Shell>
    );
  }

  const count = (table: "waitlist" | "applications" | "policies" | "claims") =>
    supabase.from(table).select("*", { count: "exact", head: true });

  const [waitlist, apps, pols, clms, { data: latest }, { data: recentApps }] = await Promise.all([
    count("waitlist"),
    count("applications"),
    count("policies"),
    count("claims"),
    supabase.from("waitlist").select("id, email, segment, marketing_consent, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("applications").select("id, status, created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  const stats = [
    { key: "waitlist", value: waitlist.count ?? 0 },
    { key: "applications", value: apps.count ?? 0 },
    { key: "policies", value: pols.count ?? 0 },
    { key: "claims", value: clms.count ?? 0 },
  ] as const;

  return (
    <Shell site="admin" badge={`ADMIN · ${me.role.toUpperCase()}`} email={email}>
      <div className="flex flex-wrap items-center justify-between gap-x-6">
        <h1 className="font-display text-3xl font-bold">{t("overview")}</h1>
        {me.role === "superadmin" && <TextLink href={await siteHref("admin", "/staff")}>{staffT("nav")}</TextLink>}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.key} className="rounded-3xl bg-white p-5">
            <p className="text-sm font-semibold text-muted">{t(`stats.${s.key}`)}</p>
            <p className="font-display mt-1 text-4xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-x-auto rounded-3xl bg-white p-6">
          <h2 className="font-display text-xl font-bold">{t("waitlistTitle")}</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-semibold">{t("columns.email")}</th>
                <th className="py-2 font-semibold">{t("columns.segment")}</th>
                <th className="py-2 font-semibold">{t("columns.newsletter")}</th>
                <th className="py-2 font-semibold">{t("columns.date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {latest?.map((w) => (
                <tr key={w.id}>
                  <td className="py-2.5 font-medium">{w.email}</td>
                  <td className="py-2.5">{segments(w.segment)}</td>
                  <td className="py-2.5">{w.marketing_consent ? t("yes") : "–"}</td>
                  <td className="py-2.5 text-muted">{date(w.created_at, locale)}</td>
                </tr>
              ))}
              {!latest?.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted">{t("waitlistEmpty")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-3xl bg-white p-6">
          <h2 className="font-display text-xl font-bold">{t("recentApplications")}</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {recentApps?.map((a) => (
              <li key={a.id} className="flex justify-between py-2.5">
                <span>{date(a.created_at, locale)}</span>
                <span className="font-semibold">{status(a.status)}</span>
              </li>
            ))}
            {!recentApps?.length && <li className="py-6 text-center text-muted">{t("applicationsEmpty")}</li>}
          </ul>
        </div>
      </section>
    </Shell>
  );
}
