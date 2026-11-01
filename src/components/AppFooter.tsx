import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { BRAND, COMPANY, CONTACT } from "@/config/company";
import { LanguageToggle } from "@/features/language/LanguageToggle";
import { isLocale, publicHref } from "@/i18n/config";

const LINK = "inline-flex min-h-11 items-center px-2.5 text-[13px] font-medium whitespace-nowrap text-muted hover:text-ink";

/**
 * Footer of every app and admin screen (approved design: canvas "Lábléc · nyelvváltó").
 * Phone: language first, then the links, then the company. Wider: company left, links and language right.
 * The terms link joins once the app's terms are published.
 */
export async function AppFooter() {
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const t = await getTranslations("appFooter");
  const c = await getTranslations("common");
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-1.5 px-5 pt-4 pb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-3">
        <p className="order-3 text-[13px] text-muted sm:order-1">
          © {new Date().getFullYear()} {COMPANY.shortName}
        </p>
        <div className="order-1 flex flex-col items-start gap-1.5 sm:order-2 sm:flex-row sm:items-center sm:gap-1">
          <div className="sm:order-2 sm:ml-2.5 sm:border-l sm:border-line sm:pl-3.5">
            <Suspense>
              <LanguageToggle to={locale === "hu" ? "en" : "hu"} />
            </Suspense>
          </div>
          <nav aria-label={t("navLabel")} className="-ml-2.5 flex flex-wrap sm:order-1 sm:ml-0">
            <a href={`${BRAND.url}${publicHref("privacy", locale)}`} className={LINK}>
              {c("privacyShort")}
            </a>
            <a href={`mailto:${CONTACT.support}`} className={LINK}>
              {CONTACT.support}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
