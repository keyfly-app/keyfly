import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogoFull } from "@/components/Logo";
import { publicHref, type Locale, type PublicPage } from "@/i18n/config";
import { LanguageSwitch } from "./LanguageSwitch";

/** Public-site header: logo, launch status, language switch and (on the home page) the sign-up shortcut. */
export async function SiteHeader({ locale, page }: { locale: Locale; page: PublicPage }) {
  const t = await getTranslations("comingSoon");
  return (
    <header className="relative z-10 border-b border-line">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
          <Link href={publicHref("home", locale)} aria-label={t("homeLabel")} className="flex flex-none">
            <LogoFull height={28} />
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-ink py-1.5 pr-3 pl-2.5 text-[13px] font-semibold whitespace-nowrap text-white">
            <span aria-hidden="true" className="anim-pulse size-2 rounded-full bg-lime" />
            <span className="sm:hidden">{t("launchBadgeShort")}</span>
            <span className="hidden sm:inline">{t("launchBadge")}</span>
          </span>
        </div>
        <div className="flex flex-none items-center gap-3">
          <LanguageSwitch locale={locale} page={page} />
          {page === "home" && (
            <a
              href="#waitlist"
              className="hidden h-11 items-center rounded-full bg-brand px-5 text-[15px] font-bold text-white no-underline transition-colors hover:bg-brand-dark sm:inline-flex"
            >
              {t("headerCta")}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
