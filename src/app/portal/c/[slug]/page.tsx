import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/Icon";
import { Shell } from "@/components/Shell";
import { Notice } from "@/components/ui/form";
import { companyBySlug } from "@/features/companies/accounts";
import { LeaseCards } from "@/features/leases/LeaseList";
import { leaseItems } from "@/features/leases/load";
import { siteHref } from "@/lib/site-href";

export const dynamic = "force-dynamic";

/** Leases shown on the Overview; the rest on the list page. */
const PREVIEW = 3;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const account = await companyBySlug((await params).slug);
  return { title: account?.name ?? "Keyfly", robots: { index: false } };
}

/**
 * Company overview (canvas v3 "Most élesíthető – cégfiók"): the member's View, the first steps that work today and the
 * company's leases in this View. Only finished features show here (Tibi, 2026-11-03).
 */
export default async function CompanyOverview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ slug }, { created }] = await Promise.all([params, searchParams]);
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const view = account.view ?? "landlord";
  const [t, nav, n, l, leases] = await Promise.all([
    getTranslations("companies.overview"),
    getTranslations("nav"),
    getTranslations("companies.menu"),
    getTranslations("leases"),
    leaseItems(account.id, view),
  ]);
  const [details, team, list] = await Promise.all([siteHref("portal", `/c/${slug}/settings/company`), siteHref("portal", `/c/${slug}/settings/team`), siteHref("portal", `/c/${slug}/leases`)]);
  const steps: { icon: IconName; title: string; text: string; href: string; cta: string }[] = [
    { icon: "building", title: t("details"), text: t("detailsText"), href: details, cta: n("company") },
    { icon: "users", title: t("team"), text: t("teamText"), href: team, cta: n("team") },
  ];
  return (
    <Shell account={account}>
      <div className="flex flex-col gap-6">
        {created && <Notice kind="success">{t("created")}</Notice>}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[22px] leading-7 font-semibold sm:text-[26px] sm:leading-8">{t("title")}</h1>
          <p className="text-sm text-muted">
            {account.name} · {nav(`views.${view}`)}
          </p>
        </div>
        <section aria-labelledby="first-steps" className="flex flex-col gap-2.5">
          <h2 id="first-steps" className="text-[15px] leading-5 font-semibold">
            {t("firstSteps")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {steps.map((s) => {
              const body = (
                <>
                  <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-[10px] bg-mist text-brand">
                    <Icon name={s.icon} size={18} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{s.title}</span>
                    <span className="text-[13px] text-muted">{s.text}</span>
                  </span>
                  <span className="mt-auto inline-flex items-center gap-0.5 text-[13px] font-semibold text-brand">
                    {s.cta}
                    <Icon name="chevronRight" size={14} strokeWidth={2} />
                  </span>
                </>
              );
              return (
                <li key={s.title}>
                  <Link href={s.href} className="flex h-full flex-col gap-2.5 rounded-xl border border-line bg-surface p-4.5 transition-colors hover:border-field motion-reduce:transition-none">
                    {body}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="company-leases" className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="company-leases" className="text-[15px] leading-5 font-semibold">
              {l("section")}
            </h2>
            {leases.length > PREVIEW && (
              <Link href={list} className="inline-flex min-h-11 items-center gap-0.5 text-[13px] font-semibold text-brand lg:min-h-6">
                {l("all")}
                <Icon name="chevronRight" size={14} strokeWidth={2} />
              </Link>
            )}
          </div>
          {leases.length ? (
            <LeaseCards items={leases.slice(0, PREVIEW)} view={view} />
          ) : (
            <p className="rounded-xl border border-dashed border-field bg-surface p-5 text-sm text-muted">{l(view === "tenant" ? "empty.companyTenant" : "empty.companyLandlord")}</p>
          )}
        </section>
      </div>
    </Shell>
  );
}
