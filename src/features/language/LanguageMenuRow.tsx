"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { LOCALES } from "@/i18n/config";
import { switchLanguage } from "./actions";

/** "Nyelv · Magyar" row of the phone Menu (canvas v3 "Mobil Menü"): opens Magyar / English, saved at once. */
export function LanguageMenuRow({ className }: { className: string }) {
  const t = useTranslations("header");
  const m = useTranslations("menu");
  const locale = useLocale();
  const back = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const [choice, setChoice] = useState(locale);
  const pick = (l: string) => {
    if (l === locale) return;
    setChoice(l);
    requestAnimationFrame(() => form.current?.requestSubmit());
  };
  return (
    <>
      <form ref={form} action={switchLanguage}>
        <input type="hidden" name="locale" value={choice} />
        <input type="hidden" name="back" value={back} />
      </form>
      <MenuPopover
        title={t("language")}
        closeLabel={t("close")}
        width={220}
        trigger={({ ref, open, toggle, menuId }) => (
          <button ref={ref} type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} className={`w-full text-left ${className}`}>
            <Icon name="globe" size={20} className="flex-none text-muted" />
            <span className="flex-1">{m("language", { name: t(`languageNames.${locale}`) })}</span>
            <Icon name="chevronRight" size={16} className="flex-none text-muted" />
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
            {t(`languageNames.${l}`)}
            {l === locale && <Icon name="check" size={16} strokeWidth={2.25} />}
          </button>
        ))}
      </MenuPopover>
    </>
  );
}
