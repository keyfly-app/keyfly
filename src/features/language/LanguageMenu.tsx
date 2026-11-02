"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { HeaderMenu } from "@/components/HeaderMenu";
import { LOCALES } from "@/i18n/config";
import { switchLanguage } from "./actions";

/** Globe icon in the header with Magyar / English (each in its own language); returns to the same page. */
export function LanguageMenu() {
  const t = useTranslations("header");
  const locale = useLocale();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return (
    <HeaderMenu
      icon="globe"
      label={t("language")}
      title={t("language")}
      heading="eyebrow"
      current={locale}
      name="locale"
      choices={LOCALES.map((l) => ({ value: l, label: t(`languageNames.${l}`), lang: l }))}
      action={switchLanguage}
      hidden={{ back: query ? `${pathname}?${query}` : pathname }}
      closeLabel={t("close")}
    />
  );
}
