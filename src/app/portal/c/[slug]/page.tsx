import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/Icon";
import { Notice } from "@/components/ui/form";
import { companyBySlug } from "@/features/companies/accounts";
import { siteHref } from "@/lib/site-href";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const account = await companyBySlug((await params).slug);
  return { title: account?.name ?? "Keyfly", robots: { index: false } };
}

/**
 * Company overview (canvas "Cégfiók – első lépések", v2.5 "Nézet a cégben"): the member's View and the first steps that
 * work today. Only finished features show here (Tibi, 2026-11-03).
 */
export default async function CompanyOverview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ slug }, { created }] = await Promise.all([params, searchParams]);
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const [t, h, n] = await Promise.all([getTranslations("companies.overview"), getTranslations("header"), getTranslations("companies.menu")]);
  const view = account.view ?? "landlord";
  const [details, team] = await Promise.all([siteHref("portal", `/c/${slug}/settings/company`), siteHref("portal", `/c/${slug}/settings/team`)]);
  const steps: { icon: IconName; title: string; text: string; href: string; cta: string }[] = [
    { icon: "building", title: t("details"), text: t("detailsText"), href: details, cta: n("company") },
    { icon: "users", title: t("team"), text: t("teamText"), href: team, cta: n("team") },
  ];
  return (
    <div className="flex flex-col gap-6">
      {created && <Notice kind="success">{t("created")}</Notice>}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[22px] leading-7 font-semibold sm:text-[26px] sm:leading-8">{t("title")}</h1>
        <p className="text-sm text-muted">
          {account.name} · {h(`views.${view}.title`)}
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
    </div>
  );
}
