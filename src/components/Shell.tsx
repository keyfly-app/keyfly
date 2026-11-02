import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { LogoFull } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { Avatar } from "@/components/ui/Avatar";
import { CONTACT } from "@/config/company";
import { LanguageMenu } from "@/features/language/LanguageMenu";
import { currentUser } from "@/features/settings/current-user";
import { ViewMenu } from "@/features/view/ViewMenu";
import { siteHref } from "@/lib/site-href";
import type { AppSite } from "@/lib/sites";

/**
 * Signed-in frame of the app (canvas "App v2.3", Menütérkép): logo, the account you are working in,
 * language and the user menu on a white top bar; content on the paper ground in a 1120 px column.
 * The account is the personal one until company accounts arrive; then this label becomes the switcher.
 */
export async function Shell({ site, children }: { site: AppSite; children: React.ReactNode }) {
  const [t, user] = await Promise.all([getTranslations("settings"), currentUser()]);
  const common = await getTranslations("common");
  const [home, profile, devices] = await Promise.all([siteHref(site, "/"), siteHref(site, "/settings/profile"), siteHref(site, "/settings/devices")]);
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href={home} className="flex-none rounded-md" aria-label={common("brand")}>
              <LogoFull height={20} />
            </Link>
            {user && (
              <>
                <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />
                <span className="hidden min-w-0 items-center gap-2 sm:flex">
                  <Avatar src={user.avatarUrl} initials={user.initials} size={26} />
                  <span className="flex min-w-0 flex-col leading-[15px]">
                    <span className="truncate text-[13px] font-semibold">{user.fullName ?? user.email}</span>
                    <span className="text-[11.5px] text-muted">{t("personalAccount")}</span>
                  </span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {user && site === "portal" && user.startView && <ViewMenu current={user.startView} />}
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
    </div>
  );
}
