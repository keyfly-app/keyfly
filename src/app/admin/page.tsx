import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { APPLICATION_STATUS, datum, SEGMENT } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect(await siteHref("admin", "/login"));

  const { data: me } = await supabase.from("staff").select("role").eq("user_id", claims.claims.sub).maybeSingle();
  if (!me) {
    return (
      <Shell site="admin" badge="ADMIN" email={claims.claims.email as string | undefined}>
        <div className="mx-auto mt-6 max-w-md rounded-3xl bg-white p-7">
          <h1 className="font-display text-2xl font-bold">Nincs hozzáférésed</h1>
          <p className="mt-2 text-muted">Ez a felület csak Keyfly-munkatársaknak szól. Ha tévedés, szólj egy adminnak.</p>
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
    supabase.from("waitlist").select("id, email, segment, consent_marketing, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("applications").select("id, status, monthly_rent, created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  const stats = [
    { label: "Várólista", value: waitlist.count ?? 0 },
    { label: "Ajánlatkérés", value: apps.count ?? 0 },
    { label: "Kötvény", value: pols.count ?? 0 },
    { label: "Kárigény", value: clms.count ?? 0 },
  ];

  return (
    <Shell site="admin" badge={`ADMIN · ${me.role.toUpperCase()}`} email={claims.claims.email as string | undefined}>
      <h1 className="font-display text-3xl font-bold">Áttekintés</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl bg-white p-5">
            <p className="text-sm font-semibold text-muted">{s.label}</p>
            <p className="font-display mt-1 text-4xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-x-auto rounded-3xl bg-white p-6">
          <h2 className="font-display text-xl font-bold">Várólista – legutóbbi 50</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-semibold">E-mail</th>
                <th className="py-2 font-semibold">Ki</th>
                <th className="py-2 font-semibold">Hírlevél</th>
                <th className="py-2 font-semibold">Dátum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {latest?.map((w) => (
                <tr key={w.id}>
                  <td className="py-2.5 font-medium">{w.email}</td>
                  <td className="py-2.5">{SEGMENT[w.segment]}</td>
                  <td className="py-2.5">{w.consent_marketing ? "igen" : "–"}</td>
                  <td className="py-2.5 text-muted">{datum(w.created_at)}</td>
                </tr>
              ))}
              {!latest?.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted">Még senki nem iratkozott fel.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-3xl bg-white p-6">
          <h2 className="font-display text-xl font-bold">Friss ajánlatkérések</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {recentApps?.map((a) => (
              <li key={a.id} className="flex justify-between py-2.5">
                <span>{datum(a.created_at)}</span>
                <span className="font-semibold">{APPLICATION_STATUS[a.status]}</span>
              </li>
            ))}
            {!recentApps?.length && <li className="py-6 text-center text-muted">Még nincs ajánlatkérés.</li>}
          </ul>
        </div>
      </section>
    </Shell>
  );
}
