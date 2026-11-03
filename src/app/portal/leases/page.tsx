import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { myAccounts } from "@/features/companies/accounts";
import { LeasesPage, readFilter } from "@/features/leases/LeasesPage";
import { currentUser } from "@/features/settings/current-user";
import { siteHref } from "@/lib/site-href";

export const dynamic = "force-dynamic";

const viewOf = async () => ((await currentUser())?.startView === "tenant" ? "tenant" : "landlord");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t(`leases.${await viewOf()}`), robots: { index: false } };
}

/** "Szerződéseim" (as tenant) or "Szerződések" (as landlord) of the personal account. */
export default async function Leases({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const [{ filter }, view, accounts] = await Promise.all([searchParams, viewOf(), myAccounts()]);
  const me = accounts.find((a) => a.kind === "person");
  if (!me) notFound();
  const [listHref, inviteHref] = await Promise.all([siteHref("portal", "/leases"), siteHref("portal", "/lease-requests/new")]);
  return (
    <Shell>
      <LeasesPage account={me} view={view} filter={readFilter(filter)} listHref={listHref} inviteHref={view === "tenant" ? inviteHref : undefined} />
    </Shell>
  );
}
