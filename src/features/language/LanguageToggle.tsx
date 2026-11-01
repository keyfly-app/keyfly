"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/i18n/config";
import { switchLanguage } from "./actions";

/** Globe + the other language's name, in that language. One press switches and returns to the same page. */
export function LanguageToggle({ to }: { to: Locale }) {
  const t = useTranslations("appFooter");
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return (
    <form action={switchLanguage}>
      <input type="hidden" name="locale" value={to} />
      <input type="hidden" name="back" value={query ? `${pathname}?${query}` : pathname} />
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface py-0 pr-4 pl-3.5 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:border-brand motion-reduce:transition-none"
      >
        <Icon name="globe" size={18} strokeWidth={1.75} className="text-brand" />
        <span className="sr-only">{t("switchTo")} </span>
        <span lang={to}>{t("otherLanguage")}</span>
      </button>
    </form>
  );
}
