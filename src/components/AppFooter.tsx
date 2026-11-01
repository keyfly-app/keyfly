import { getLocale, getTranslations } from "next-intl/server";
import { BRAND, COMPANY, CONTACT } from "@/config/company";
import { isLocale, publicHref } from "@/i18n/config";

const LINK = "inline-flex min-h-11 items-center text-muted hover:text-ink sm:min-h-6";

/**
 * Quiet footer of every app and admin screen (App v2.2): company, privacy, support.
 * The language switch lives in the header. The terms link joins once the app's terms are published.
 */
export async function AppFooter() {
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const t = await getTranslations("appFooter");
  const c = await getTranslations("common");
  return (
    <footer className="px-5 pt-2 pb-5 sm:px-8 sm:pb-6">
      <div className="flex flex-col items-center gap-x-5 text-[12.5px] text-muted sm:flex-row sm:flex-wrap sm:justify-center">
        <nav aria-label={t("navLabel")} className="order-1 flex gap-5 sm:order-2">
          <a href={`${BRAND.url}${publicHref("privacy", locale)}`} className={LINK}>
            {c("privacyShort")}
          </a>
          <a href={`mailto:${CONTACT.support}`} className={LINK}>
            {CONTACT.support}
          </a>
        </nav>
        <p className="order-2 sm:order-1">
          © {new Date().getFullYear()} {COMPANY.shortName}
        </p>
      </div>
    </footer>
  );
}
