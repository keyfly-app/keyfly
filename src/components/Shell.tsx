import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { Toaster } from "@/components/Toaster";
import { LogoFull } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { AccountSwitcher, type SwitcherAccount } from "@/components/AccountSwitcher";
import { CONTACT } from "@/config/company";
import { accountInitials, myAccounts, type AccountSummary } from "@/features/companies/accounts";
import { LanguageMenu } from "@/features/language/LanguageMenu";
import { currentUser } from "@/features/settings/current-user";
import { ViewMenu } from "@/features/view/ViewMenu";
import { siteHref } from "@/lib/site-href";
import type { AppSite } from "@/lib/sites";

/**
 * Signed-in frame of the app (canvas "App v2.3", Menütérkép): logo, the account switcher (where you work now),
 * view, language and the user menu on a white top bar; content on the paper ground in a 1120 px column.
 * `account`: the company account of a /c/<slug> page; otherwise the personal account.
 */
export async function Shell({ site, account, children }: { site: AppSite; account?: AccountSummary; children: React.ReactNode }) {
  const [t, a, user, accounts] = await Promise.all([getTranslations("settings"), getTranslations("accounts"), currentUser(), myAccounts()]);
  const common = await getTranslations("common");
  const [home, profile, devices, addCompany] = await Promise.all([
    siteHref(site, "/"),
    siteHref(site, "/settings/profile"),
    siteHref(site, "/settings/devices"),
    siteHref(site, "/companies/new"),
  ]);
  const switcher: SwitcherAccount[] = await Promise.all(
    accounts.map(async (acc) => ({
      id: acc.id,
      company: acc.kind === "company",
      name: acc.kind === "person" ? (user?.fullName ?? user?.email ?? acc.name) : acc.name,
      sub: `${a(`kind.${acc.kind}`)} · ${a(`plans.${acc.plan}`)}`,
      href: acc.kind === "person" ? home : await siteHref(site, `/c/${acc.slug}`),
      initials: acc.kind === "person" ? (user?.initials ?? "") : accountInitials(acc.name),
      avatarUrl: acc.kind === "person" ? (user?.avatarUrl ?? null) : null,
    })),
  );
  const personal = switcher.find((s) => !s.company);
  const active = account ? switcher.find((s) => s.id === account.id) : personal;
  const current = active && {
    ...active,
    sub: account ? `${a("company")} · ${a(`plans.${account.plan}`)}` : a("personal"),
  };
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href={active?.href ?? home} className={`flex-none rounded-md ${current ? "hidden sm:block" : ""}`} aria-label={common("brand")}>
              <LogoFull height={20} />
            </Link>
            {user && current && active && (
              <>
                <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />
                <AccountSwitcher
                  accounts={switcher}
                  currentId={active.id}
                  current={current}
                  addHref={addCompany}
                  labels={{ button: a("label", { name: current.name }), title: a("title"), add: a("add"), note: a("note"), close: a("close") }}
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
                items={[
                  { href: profile, label: t("nav.profile"), icon: "user" },
                  { href: devices, label: t("nav.devices"), icon: "laptop" },
                  { href: `mailto:${CONTACT.support}`, label: t("userMenu.help"), icon: "help", external: true },
                ]}
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
