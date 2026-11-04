import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AccountSwitcher, type SwitcherAccount } from "@/components/AccountSwitcher";
import { AppFooter } from "@/components/AppFooter";
import { BottomBar } from "@/components/BottomBar";
import { ContextChip } from "@/components/ContextChip";
import { Icon } from "@/components/Icon";
import { LogoFull } from "@/components/Logo";
import { SideNav, type NavItem } from "@/components/SideNav";
import { Toaster } from "@/components/Toaster";
import { UserMenu } from "@/components/UserMenu";
import { accountInitials, myAccounts, type AccountSummary, type AccountView } from "@/features/companies/accounts";
import { hasAcceptedTerms } from "@/features/auth/google";
import { LanguageMenu } from "@/features/language/LanguageMenu";
import { isTodo, tenantCards } from "@/features/lease-requests/load";
import { canEditProperties } from "@/features/properties/load";
import { currentUser } from "@/features/settings/current-user";
import { settingsMenu } from "@/features/settings/links";
import { SettingsNav } from "@/features/settings/SettingsNav";
import { settingsSummary } from "@/features/settings/summary";
import { ViewSwitch } from "@/features/view/ViewSwitch";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";

/**
 * Signed-in frame of the app (canvas v3 "Most élesíthető"). Desktop: white top bar (logo; language and user menu) and a
 * 256 px left column – the account switcher, the View switch, the menu of this account and View, settings at the
 * bottom; settings pages turn it into the settings menu with the way back (`settings`). Phones and tablets: the context
 * chip on top and a bottom bar. `account`: the company account of a /c/<slug> page; otherwise the personal account.
 */
export async function Shell({ account, settings = false, children }: { account?: AccountSummary; settings?: boolean; children: React.ReactNode }) {
  const [t, a, inv, nav, lr, pr, common, user, accounts] = await Promise.all([
    getTranslations("settings"),
    getTranslations("accounts"),
    getTranslations("invite"),
    getTranslations("nav"),
    getTranslations("leaseRequest"),
    getTranslations("properties"),
    getTranslations("common"),
    currentUser(),
    myAccounts(),
  ]);
  // Signed up with Google but the terms are not accepted yet (canvas v2.4 "Regisztráció Google-lel – még egy lépés").
  if (user && !user.providers.includes("email") && !(await hasAcceptedTerms(await createClient(), user.id))) redirect(await siteHref("portal", "/register/google"));
  const href = (path: string) => siteHref("portal", path);
  const personalView: AccountView = user?.startView === "tenant" ? "tenant" : "landlord";
  // Companies show your role in them and their plan ("Fiókgazda · Alap"); the personal account just "Magánfiók".
  const sub = (acc: AccountSummary) => (acc.kind === "person" ? a("personal") : `${inv(`roles.${acc.role}`)} · ${a(`plans.${acc.plan}`)}`);
  const switcher: SwitcherAccount[] = await Promise.all(
    accounts.map(async (acc) => ({
      id: acc.id,
      company: acc.kind === "company",
      name: acc.kind === "person" ? (user?.fullName ?? user?.email ?? acc.name) : acc.name,
      sub: sub(acc),
      href: await href(acc.kind === "person" ? "/" : `/c/${acc.slug}`),
      initials: acc.kind === "person" ? (user?.initials ?? "") : accountInitials(acc.name),
      avatarUrl: acc.kind === "person" ? (user?.avatarUrl ?? null) : null,
      logoUrl: acc.logoUrl,
      view: acc.view ?? personalView,
    })),
  );
  const current = account ? switcher.find((s) => s.id === account.id) : switcher.find((s) => !s.company);
  const view = current?.view ?? personalView;
  const base = account ? `/c/${account.slug}` : "";
  const [home, leases, properties, newProperty, menu, settingsHref, newRequest, requests, summaryHref, profile, security, notifications, bank, companies, data, addCompany, summary] = await Promise.all([
    href(base || "/"),
    href(`${base}/leases`),
    href(`${base}/properties`),
    href(`${base}/properties/new`),
    href(`${base}/menu`),
    href(`${base}/settings`),
    href("/lease-requests/new"),
    href("/lease-requests/"),
    href("/settings"),
    href("/settings/profile"),
    href("/settings/security"),
    href("/settings/notifications"),
    href("/settings/bank"),
    href("/settings/companies"),
    href("/settings/data"),
    href("/companies/new"),
    settingsSummary(),
  ]);
  const stepsDone = summary?.steps.filter((s) => s.done).length ?? 0;
  const setup =
    summary && stepsDone < summary.steps.length
      ? { href: summaryHref, label: t("summary.guide.title"), done: stepsDone, total: summary.steps.length, progressLabel: t("summary.guide.progress", { done: stepsDone, total: summary.steps.length }) }
      : undefined;
  // The tenant's to-dos on "Szerződéseim", the same rule as the Overview's summary.
  const todos = view === "tenant" && current ? (await tenantCards(current.id)).filter(isTodo).length : 0;
  // A landlord works from the properties; only roles that may add one get the bar's "+" for it.
  const landlord = view === "landlord";
  const role = account?.role ?? "owner";
  const propertiesItem: NavItem = { href: properties, label: nav("properties"), icon: "home", prefixes: [`${properties}/`] };
  const items: NavItem[] = [
    { href: home, label: nav("overview"), icon: "layout" },
    ...(landlord ? [propertiesItem] : []),
    {
      href: leases,
      label: nav(`leases.${view}`),
      icon: "document",
      // A lease request's page belongs to the personal account's leases.
      prefixes: account ? [] : [requests],
      count: { value: todos, label: nav("todos", { count: todos }) },
    },
  ];
  const settingsItem: NavItem = { href: settingsHref, label: nav(account ? "companySettings" : "settings"), icon: "settings" };
  // Settings are reached from the Menu on phones: it stays marked there.
  const menuItem: NavItem = { href: menu, label: nav("menu"), icon: "list", prefixes: [settingsHref] };
  const settingsNav = settings ? await settingsMenu() : null;

  return (
    <div className="flex min-h-dvh flex-col bg-paper [--app-bottom:calc(4rem+env(safe-area-inset-bottom))] lg:[--app-bottom:0px]">
      <header className="z-30 border-b border-line bg-surface lg:sticky lg:top-0">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:pr-5 lg:pl-6">
          {/* The logo goes to the Overview of the account you are in; phones show where you work instead. */}
          <Link href={current?.href ?? home} className="hidden flex-none rounded-md lg:flex" aria-label={common("homeLink")}>
            <LogoFull height={20} />
          </Link>
          {current && (
            <div className="flex min-w-0 lg:hidden">
              <ContextChip accounts={switcher} current={current} addHref={addCompany} />
            </div>
          )}
          <div className="hidden items-center gap-1 lg:flex">
            <Suspense>
              <LanguageMenu />
            </Suspense>
            {user && (
              <>
                <span aria-hidden="true" className="mx-2 h-6 w-px bg-line" />
                <UserMenu
                  site="portal"
                  name={user.fullName}
                  email={user.email}
                  initials={user.initials}
                  avatarUrl={user.avatarUrl}
                  openLabel={t("userMenu.open")}
                  signOutLabel={common("signOut")}
                  setup={setup}
                  items={[
                    { href: summaryHref, label: t("nav.summary"), icon: "layout" },
                    { href: profile, label: t("nav.profile"), icon: "user" },
                    { href: security, label: t("nav.security"), icon: "lock" },
                    { href: bank, label: t("nav.bank"), icon: "bank" },
                    { href: notifications, label: t("nav.notifications"), icon: "bell" },
                    { href: data, label: t("nav.data"), icon: "shield" },
                  ]}
                  more={[{ href: addCompany, label: a("add"), icon: "building" }]}
                />
              </>
            )}
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        {current && (
          // Only the long settings menu scrolls: a scrolling column would clip the account menu that opens beside it.
          <aside
            className={`sticky top-14 z-20 hidden h-[calc(100dvh-3.5rem)] w-64 flex-none flex-col border-r border-line bg-surface px-3 py-4 lg:flex ${settingsNav ? "overflow-y-auto" : ""}`}
          >
            {settingsNav ? (
              <>
                <Link href={home} className="flex h-10 min-w-0 items-center gap-2 rounded-lg px-2 text-[13.5px] font-semibold hover:bg-paper">
                  <Icon name="back" size={16} strokeWidth={2} className="flex-none" />
                  <span className="truncate">{nav("back", { name: current.name })}</span>
                </Link>
                <div className="mx-1 mt-2.5 mb-1 h-px bg-line" />
                <SettingsNav label={settingsNav.label} groups={settingsNav.groups} add={settingsNav.add} />
              </>
            ) : (
              <>
                <AccountSwitcher
                  accounts={switcher}
                  currentId={current.id}
                  current={current}
                  addHref={addCompany}
                  manage={{ href: companies, label: a("manage") }}
                  settings={account ? { href: settingsHref, label: a("settings") } : undefined}
                  labels={{ button: a("label", { name: current.name }), title: a("title"), add: a("add") }}
                />
                <div className="mt-2.5">
                  <ViewSwitch current={view} accountId={account?.id} />
                </div>
                <SideNav label={nav("label")} items={items} footer={settingsItem} />
              </>
            )}
          </aside>
        )}
        <div className="flex min-w-0 flex-1 flex-col pb-(--app-bottom)">
          <main className="flex w-full max-w-[1120px] flex-1 flex-col px-4 py-6 sm:px-8 lg:px-10 lg:pt-8 lg:pb-10">{children}</main>
          <AppFooter />
        </div>
      </div>
      {current && (
        <BottomBar
          label={nav("barLabel")}
          items={[...items, menuItem]}
          // The tenant's one action today records in the personal account, so only there; the landlord's adds a property.
          add={
            landlord
              ? canEditProperties(role)
                ? { href: newProperty, label: nav("new"), name: nav("newLabel", { action: pr("add") }) }
                : undefined
              : !account
                ? { href: newRequest, label: nav("new"), name: nav("newLabel", { action: lr("inviteLandlord") }) }
                : undefined
          }
        />
      )}
      <Toaster />
    </div>
  );
}
