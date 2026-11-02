"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { switchLanguage } from "@/features/language/actions";
import { LOCALES } from "@/i18n/config";

/** Nyelv row of the profile: the language of the app and of our emails, chosen from a menu, saved at once. */
export function LanguageRow() {
  const back = usePathname();
  const t = useTranslations("settings.profile");
  const h = useTranslations("header");
  const locale = useLocale();
  const form = useRef<HTMLFormElement>(null);
  const [choice, setChoice] = useState(locale);
  const pick = (l: string) => {
    if (l === locale) return;
    setChoice(l);
    requestAnimationFrame(() => form.current?.requestSubmit());
  };
  return (
    <li className="flex items-center gap-3 border-t border-line px-5 py-3.5 sm:px-6">
      <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-mist text-brand">
        <Icon name="globe" size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{t("language")}</span>
        <span className="text-[12.5px] text-muted">{t("languageText")}</span>
      </div>
      <form ref={form} action={switchLanguage}>
        <input type="hidden" name="locale" value={choice} />
        <input type="hidden" name="back" value={back} />
      </form>
      <MenuPopover
        title={t("language")}
        closeLabel={h("close")}
        align="end"
        width={200}
        trigger={({ ref, open, toggle, menuId }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={`${t("language")}: ${h(`languageNames.${locale}`)}`}
            className={`flex h-11 w-36 items-center justify-between gap-2 rounded-lg border bg-surface pr-2.5 pl-3 text-sm sm:h-9 ${open ? "border-ink" : "border-field hover:border-ink"}`}
          >
            <span lang={locale}>{h(`languageNames.${locale}`)}</span>
            <Icon name="chevronDown" size={16} className="text-muted" />
          </button>
        )}
      >
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            role="menuitemradio"
            aria-checked={l === locale}
            lang={l}
            onClick={() => pick(l)}
            className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-paper focus-visible:bg-paper sm:min-h-9 sm:px-2.5 ${l === locale ? "bg-paper" : ""}`}
          >
            {h(`languageNames.${l}`)}
            {l === locale && <Icon name="check" size={16} strokeWidth={2.25} />}
          </button>
        ))}
      </MenuPopover>
    </li>
  );
}
