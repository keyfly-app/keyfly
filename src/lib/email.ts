import { createTranslator } from "next-intl";
import { BRAND, COMPANY, CONTACT, formatCompanyAddress } from "@/config/company";
import { publicHref, type Locale } from "@/i18n/config";
import type { EmailCompany, EmailLabels } from "@/lib/email-layout";
import hu from "../../messages/hu.json";
import en from "../../messages/en.json";

/** Footer labels of the shared email layout, in the reader's language. */
export function emailLabels(locale: Locale): EmailLabels {
  const t = createTranslator({ locale, messages: locale === "en" ? en : hu, namespace: "emailLayout" });
  return { fallback: t("fallback"), privacy: t("privacy"), support: t("support"), registration: t("registration"), taxNumber: t("taxNumber") };
}

/** Company facts for the email footer – always from src/config/company.ts. */
export function emailCompany(locale: Locale): EmailCompany {
  return {
    shortName: COMPANY.shortName,
    address: formatCompanyAddress(),
    registrationNumber: COMPANY.registrationNumber,
    taxNumber: COMPANY.taxNumber,
    support: CONTACT.support,
    siteUrl: BRAND.url,
    privacyUrl: `${BRAND.url}${publicHref("privacy", locale)}`,
  };
}
