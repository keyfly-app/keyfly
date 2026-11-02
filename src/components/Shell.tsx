import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { Toaster } from "@/components/Toaster";
import { LogoFull, LogoMark } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { AccountSwitcher, type SwitcherAccount } from "@/components/AccountSwitcher";
import { accountInitials, myAccounts, type AccountSummary } from "@/features/companies/accounts";
import { hasAcceptedTerms } from "@/features/auth/google";
import { LanguageMenu } from "@/features/language/LanguageMenu";
import { currentUser } from "@/features/settings/current-user";
import { settingsSummary } from "@/features/settings/summary";
import { ViewMenu } from "@/features/view/ViewMenu";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";
import type { AppSite } from "@/lib/sites";

/**
 * Signed-in frame of the app (canvas "App v2.3", Menütérkép): logo, the account switcher (where you work now),
 * view, language and the user menu on a white top bar; content on the paper ground in a 1120 px column.
 * `account`: the company account of a /c/<slug> page; otherwise the personal account.
 */
export async function Shell({ site, account, children }: { site: AppSite; account?: AccountSummary; children: React.ReactNode }) {
  const [t, a, inv, user, accounts] = await Promise.all([getTranslations("settings"), getTranslations("accounts"), getTranslations("invite"), currentUser(), myAccounts()]);
  const common = await getTranslations("common");
  // Signed up with Google but the terms are not accepted yet (canvas v2.4 "Regisztráció Google-lel – még egy lépés").
  if (site === "portal" && user && !user.providers.includes("email") && !(await hasAcceptedTerms(await createClient(), user.id))) redirect(await siteHref("portal", "/register/google"));
  const [home, summaryHref, profile, security, notifications, bank, companies, data, addCompany, summary] = await Promise.all([
    siteHref(site, "/"),
    siteHref(site, "/settings"),
    siteHref(site, "/settings/profile"),
    siteHref(site, "/settings/security"),
    siteHref(site, "/settings/notifications"),
    siteHref(site, "/settings/bank"),
    siteHref(site, "/settings/companies"),
    siteHref(site, "/settings/data"),
    siteHref(site, "/companies/new"),
    site === "portal" ? settingsSummary() : Promise.resolve(null),
  ]);
  const stepsDone = summary?.steps.filter((s) => s.done).length ?? 0;
  const setup =
    summary && stepsDone < summary.steps.length
      ? { href: summaryHref, label: t("summary.guide.title"), done: stepsDone, total: summary.steps.length, progressLabel: t("summary.guide.progress", { done: stepsDone, total: summary.steps.length }) }
      : undefined;
  // Companies show your role in them and their plan ("Fiókgazda · Alap"); the personal account just "Magánfiók".
  const sub = (acc: AccountSummary) => (acc.kind === "person" ? a("personal") : `${inv(`roles.${acc.role}`)} · ${a(`plans.${acc.plan}`)}`);
  const switcher: SwitcherAccount[] = await Promise.all(
    accounts.map(async (acc) => ({
      id: acc.id,
      company: acc.kind === "company",
      name: acc.kind === "person" ? (user?.fullName ?? user?.email ?? acc.name) : acc.name,
      sub: sub(acc),
      href: acc.kind === "person" ? home : await siteHref(site, `/c/${acc.slug}`),
      initials: acc.kind === "person" ? (user?.initials ?? "") : accountInitials(acc.name),
      avatarUrl: acc.kind === "person" ? (user?.avatarUrl ?? null) : null,
    })),
  );
  const personal = switcher.find((s) => !s.company);
  const active = account ? switcher.find((s) => s.id === account.id) : personal;
  const current = active;
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-1 sm:gap-4">
            {/* The logo goes to the Overview of the account you are in. Phones show the mark only, beside the switcher. */}
            <Link href={active?.href ?? home} className="flex flex-none rounded-md" aria-label={common("homeLink")}>
              <span className={current ? "hidden sm:block" : ""}>
                <LogoFull height={20} />
              </span>
              {current && (
                <span className="-ml-2.5 flex size-11 items-center justify-center sm:hidden">
                  <LogoMark size={26} />
                </span>
              )}
            </Link>
            {user && current && active && (
              <>
                <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />
                <AccountSwitcher
                  accounts={switcher}
                  currentId={active.id}
                  current={current}
                  addHref={addCompany}
                  manage={site === "portal" ? { href: companies, label: a("manage") } : undefined}
                  settings={account?.slug ? { href: await siteHref(site, `/c/${account.slug}/settings`), label: a("settings") } : undefined}
                  labels={{ button: a("label", { name: current.name }), title: a("title"), add: a("add"), close: a("close") }}
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {user && site === "portal" && !account && user.startView && <ViewMenu current={user.startView === "tenant" ? "tenant" : "landlord"} />}
            <Suspense>
              <LanguageMenu />
            </Suspense>
            {user && <span aria-hidden="true" className="mx-1 h-6 w-px bg-line sm:mx-2" />}
            {user && (
              <UserMenu
                site={site}
                name={user.fullName}
                email={user.email}
                initials={user.initials}
                avatarUrl={user.avatarUrl}
                openLabel={t("userMenu.open")}
                signOutLabel={common("signOut")}
                setup={setup}
                items={
                  site === "portal"
                    ? [
                        { href: summaryHref, label: t("nav.summary"), icon: "layout" },
                        { href: profile, label: t("nav.profile"), icon: "user" },
                        { href: security, label: t("nav.security"), icon: "lock" },
                        { href: bank, label: t("nav.bank"), icon: "bank" },
                        { href: notifications, label: t("nav.notifications"), icon: "bell" },
                        { href: data, label: t("nav.data"), icon: "shield" },
                      ]
                    : [
                        { href: profile, label: t("nav.profile"), icon: "user" },
                        { href: security, label: t("nav.security"), icon: "lock" },
                        { href: notifications, label: t("nav.notifications"), icon: "bell" },
                        { href: data, label: t("nav.data"), icon: "shield" },
                      ]
                }
                more={site === "portal" ? [{ href: addCompany, label: a("add"), icon: "building" }] : []}
              />
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      <AppFooter />
      <Toaster />
    </div>
  );
}
