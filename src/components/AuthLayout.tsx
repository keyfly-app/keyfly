import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { Icon } from "@/components/Icon";
import { LogoFull } from "@/components/Logo";
import { LanguageMenu } from "@/features/language/LanguageMenu";
import { BRAND } from "@/config/company";
import { isLocale, publicHref } from "@/i18n/config";
import { siteHref } from "@/lib/site-href";

/** Phone: plain white page. From 640 px: the App v2.2 card (same look as CARD_CLASS). */
const AUTH_CARD =
  "flex w-full flex-col gap-5 sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-8 sm:shadow-[0_1px_2px_rgb(12_31_25/0.04),0_16px_40px_-24px_rgb(12_31_25/0.22)]";

/** The lime-on-ink "Admin" badge beside the logo (App v2.2). */
export function AdminBadge({ label }: { label: string }) {
  return <span className="inline-flex h-5 items-center rounded-[5px] bg-ink px-[7px] text-[11px] font-semibold tracking-[0.03em] text-lime">{label}</span>;
}

/**
 * Frame for sign-in, sign-up, verification and invitation screens (App v2.2):
 * header with the logo (and the Admin badge), language on the right; one centred card; a quiet footer.
 * Phone: the form sits on white without a card. `wide`: the authenticator setup needs a little more room.
 */
export async function AuthLayout({
  back,
  badge,
  wide = false,
  children,
}: {
  back?: { href: string; label: string };
  badge?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const t = await getTranslations("common");
  const admin = await getTranslations("adminAuth");
  const raw = await getLocale();
  // The logo goes to the public site (or, on admin, to the admin start page).
  const home = badge ? await siteHref("admin", "/") : `${BRAND.url}${publicHref("home", isLocale(raw) ? raw : "hu")}`;
  return (
    <div className="flex min-h-dvh flex-col bg-surface sm:bg-paper">
      <header className="flex h-14 items-center justify-between gap-4 px-4 sm:h-16 sm:px-8">
        {back ? (
          <Link href={back.href} className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-ink">
            <Icon name="back" size={18} />
            {back.label}
          </Link>
        ) : (
          <div className="flex items-center gap-2.5">
            <a href={home} aria-label={t("homeLink")} className="flex rounded-md">
              <LogoFull height={22} />
            </a>
            {badge && <AdminBadge label={admin("badge")} />}
          </div>
        )}
        <div className="flex items-center gap-4">
          {badge && (
            <span className="hidden items-center gap-1.5 text-[12.5px] text-muted sm:inline-flex">
              <Icon name="lock" size={14} />
              {admin("staffOnly")}
            </span>
          )}
          <Suspense>
            <LanguageMenu />
          </Suspense>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-5 pt-6 pb-10 sm:items-start sm:pt-16">
        <div className={`${AUTH_CARD} ${wide ? "max-w-[460px]" : "max-w-[400px]"}`}>{children}</div>
      </main>
      <AppFooter />
    </div>
  );
}
