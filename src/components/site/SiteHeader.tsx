import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogoFull, LogoPro } from "@/components/Logo";
import { publicHref, type Locale, type PublicPage } from "@/i18n/config";
import { LanguageSwitch } from "./LanguageSwitch";

/**
 * Public-site header: logo, launch status, language switch and an optional sign-up shortcut (`signupHref`).
 * On the Pro page the Keyfly Pro logo replaces the launch badge.
 */
export async function SiteHeader({ locale, page, signupHref }: { locale: Locale; page: PublicPage; signupHref?: string }) {
  const t = await getTranslations("comingSoon");
  const c = await getTranslations("common");
  const pro = page === "pro";
  return (
    <header className="relative z-10 border-b border-line">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
          <Link href={publicHref("home", locale)} aria-label={t("homeLabel")} className="flex flex-none">
            {pro ? <LogoPro height={28} label={c("proLabel")} /> : <LogoFull height={28} />}
          </Link>
          {!pro && (
            <span className="inline-flex items-center gap-2 rounded-full bg-ink py-1.5 pr-3 pl-2.5 text-[13px] font-semibold whitespace-nowrap text-white">
              <span aria-hidden="true" className="anim-pulse size-2 rounded-full bg-lime" />
              <span className="sm:hidden">{t("launchBadgeShort")}</span>
              <span className="hidden sm:inline">{t("launchBadge")}</span>
            </span>
          )}
        </div>
        <div className="flex flex-none items-center gap-3">
          <LanguageSwitch locale={locale} page={page} />
          {signupHref && (
            <a
              href={signupHref}
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
