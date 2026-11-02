import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AdminBadge } from "@/components/AuthLayout";
import { AppFooter } from "@/components/AppFooter";
import { Icon, type IconName } from "@/components/Icon";
import { LogoFull } from "@/components/Logo";
import { signOut } from "@/features/auth/actions";
import { LanguageMenu } from "@/features/language/LanguageMenu";
import { siteHref } from "@/lib/site-href";

type NavKey = "overview" | "staff";
const IS_PRODUCTION = process.env.NEXT_PUBLIC_APP_ENV === "production";

/**
 * The admin frame (App v2.2): menu on the left (top on phones), a slim top bar with the page title and the
 * environment, content on the paper ground. Only pages that exist are in the menu; staff management is for super admins.
 */
export async function AdminShell({
  active,
  title,
  user,
  superadmin,
  actions,
  children,
}: {
  active: NavKey;
  title: string;
  user: { name: string; email: string };
  superadmin: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = await getTranslations("admin");
  const auth = await getTranslations("adminAuth");
  const staff = await getTranslations("adminStaff");
  const common = await getTranslations("common");
  const items: { key: NavKey; icon: IconName; label: string; href: string }[] = [
    { key: "overview", icon: "home", label: t("overview"), href: await siteHref("admin", "/") },
    ...(superadmin ? [{ key: "staff" as const, icon: "users" as const, label: staff("nav"), href: await siteHref("admin", "/staff") }] : []),
  ];
  const initials = (user.name || user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-dvh flex-col bg-paper md:flex-row">
      <aside className="flex flex-col border-b border-line bg-surface md:sticky md:top-0 md:h-dvh md:w-59 md:flex-none md:border-r md:border-b-0">
        <div className="flex h-14 items-center gap-2.5 px-4 md:h-16 md:px-5">
          <Link href={items[0]!.href} aria-label={common("homeLink")} className="flex rounded-md">
            <LogoFull height={20} />
          </Link>
          <AdminBadge label={auth("badge")} />
        </div>
        <nav aria-label={t("navLabel")} className="px-2 pb-2 md:px-3 md:pb-0">
          <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
            {items.map((item) => {
              const current = item.key === active;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex h-11 items-center gap-2.5 rounded-[7px] px-2.5 text-[13.5px] whitespace-nowrap md:h-[34px] ${current ? "bg-paper font-semibold text-ink" : "font-medium text-muted hover:bg-paper hover:text-ink"}`}
                  >
                    <Icon name={item.icon} size={16} className={current ? "text-ink" : "text-muted"} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto hidden items-center gap-2.5 border-t border-line px-5 py-3.5 md:flex">
          <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-lime">
            {initials}
          </span>
          <span className="flex min-w-0 flex-1 flex-col text-[12.5px] leading-4">
            <b className="truncate font-semibold">{user.name || user.email}</b>
            <span className="truncate text-muted">{user.email}</span>
          </span>
          <form action={signOut}>
            <input type="hidden" name="site" value="admin" />
            <button type="submit" aria-label={common("signOut")} title={common("signOut")} className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink">
              <Icon name="logout" size={16} />
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5 md:px-7">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[15px] font-semibold">{title}</h1>
            {!IS_PRODUCTION && <span className="inline-flex h-[22px] items-center rounded-md bg-warning-soft px-2 text-xs font-medium text-warning-ink">Staging</span>}
          </div>
          <div className="flex items-center gap-2.5">
            {actions}
            <Suspense>
              <LanguageMenu />
            </Suspense>
            <form action={signOut} className="md:hidden">
              <input type="hidden" name="site" value="admin" />
              <button type="submit" className="inline-flex h-11 items-center px-1 text-[13px] font-medium">
                {common("signOut")}
              </button>
            </form>
          </div>
        </header>
        <main className="flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 py-6 md:px-7">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}
