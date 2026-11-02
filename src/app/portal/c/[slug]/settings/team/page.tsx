import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { canManage, companyBySlug } from "@/features/companies/accounts";
import { TeamView } from "@/features/companies/TeamView";
import { isLocale } from "@/i18n/config";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("companies.team");
  return { title: t("title"), robots: { index: false } };
}

/** Csapat: loads members, open access requests and pending invitations (the last two for owner/admin only). */
export default async function CompanyTeam({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const manage = canManage(account);
  const supabase = await createClient();
  const [raw, { data: auth }, { data: members }, requests, invitations, backHref] = await Promise.all([
    getLocale(),
    supabase.auth.getClaims(),
    supabase.rpc("account_members_list", { p_account_id: account.id }),
    manage ? supabase.rpc("account_access_requests_list", { p_account_id: account.id }).then((r) => r.data ?? []) : Promise.resolve([]),
    manage
      ? supabase
          .from("invitations")
          .select("id, email, account_role, expires_at")
          .eq("account_id", account.id)
          .eq("kind", "account_member")
          .is("accepted_at", null)
          .is("declined_at", null)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    siteHref("portal", `/c/${slug}/settings`),
  ]);
  return (
    <TeamView
      accountId={account.id}
      companyName={account.name}
      manage={manage}
      enterprise={account.plan === "enterprise"}
      me={auth?.claims.sub}
      locale={isLocale(raw) ? raw : "hu"}
      backHref={backHref}
      members={members ?? []}
      requests={requests}
      invitations={invitations}
    />
  );
}
