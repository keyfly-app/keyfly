import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { APPLICATION_STATUS, datum, ft } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect(await siteHref("portal", "/login"));

  const [{ data: profile }, { data: applications }, { data: policies }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").single(),
    supabase.from("applications").select("id, status, monthly_rent, deposit_amount, address_text, created_at").order("created_at", { ascending: false }),
    supabase.from("policies").select("id, policy_number, status, coverage_amount, premium_amount, billing_period"),
  ]);

  const firstName = profile?.full_name?.split(" ").at(-1);

  return (
    <Shell site="portal" email={profile?.email}>
      <h1 className="font-display text-4xl font-bold">Szia{firstName ? `, ${firstName}` : ""}!</h1>
      <p className="mt-2 text-muted">Itt látod az ajánlatkéréseidet és a fedezeti igazolásaidat.</p>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6">
          <h2 className="font-display text-xl font-bold">Ajánlatkéréseim</h2>
          {applications?.length ? (
            <ul className="mt-4 divide-y divide-line">
              {applications.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold">{a.address_text ?? "Cím később"}</p>
                    <p className="text-sm text-muted">
                      {ft(a.monthly_rent)} / hó · kaució {ft(a.deposit_amount)} · {datum(a.created_at)}
                    </p>
                  </div>
                  <span className="rounded-full bg-mint px-3 py-1 text-sm font-semibold text-green">
                    {APPLICATION_STATUS[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-paper p-5 text-muted">
              Még nincs ajánlatkérésed. Az online ajánlatkérés hamarosan itt indul.
            </p>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6">
          <h2 className="font-display text-xl font-bold">Fedezeti igazolásaim</h2>
          {policies?.length ? (
            <ul className="mt-4 divide-y divide-line">
              {policies.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{p.policy_number}</p>
                    <p className="text-sm text-muted">Fedezet: {ft(p.coverage_amount)}</p>
                  </div>
                  <span className="text-sm font-semibold">
                    {ft(p.premium_amount)} / {p.billing_period === "monthly" ? "hó" : "év"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-paper p-5 text-muted">Még nincs aktív fedezeted.</p>
          )}
        </div>
      </section>
    </Shell>
  );
}
