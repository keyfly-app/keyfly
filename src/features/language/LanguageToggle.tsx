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
        className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium whitespace-nowrap text-ink transition-colors hover:border-field motion-reduce:transition-none sm:h-8"
      >
        <Icon name="globe" size={14} strokeWidth={1.75} className="text-muted" />
        <span className="sr-only">{t("switchTo")} </span>
        <span lang={to}>{t("otherLanguage")}</span>
      </button>
    </form>
  );
}
