import { getTranslations } from "next-intl/server";
import { LOCALES, publicHref, type Locale, type PublicPage } from "@/i18n/config";

const NAMES: Record<Locale, string> = { hu: "Magyar", en: "English" };

/**
 * HU / EN switch for public pages. Each link carries ?lang=, which the proxy turns into the
 * remembered-language cookie and then redirects to the clean URL – no JavaScript needed.
 */
export async function LanguageSwitch({ locale, page }: { locale: Locale; page: PublicPage }) {
  const t = await getTranslations("common");
  return (
    <nav aria-label={t("languageNav")} className="flex rounded-full border border-line bg-surface p-[3px]">
      {LOCALES.map((l) => {
        const current = l === locale;
        return (
          <a
            key={l}
            href={`${publicHref(page, l)}?lang=${l}`}
            lang={l}
            hrefLang={current ? undefined : l}
            aria-current={current ? "page" : undefined}
            className={`flex h-10 min-w-10 sm:min-w-[46px] items-center justify-center rounded-full text-sm font-bold no-underline ${
              current ? "bg-ink text-white" : "text-muted hover:text-ink"
            }`}
          >
            <span aria-hidden="true">{l.toUpperCase()}</span>
            <span className="sr-only">{NAMES[l]}</span>
          </a>
        );
      })}
    </nav>
  );
}
