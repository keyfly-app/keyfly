import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { ErrorFrame, ErrorState } from "@/components/ErrorState";
import { LanguageSwitch } from "@/components/site/LanguageSwitch";
import { isLocale, publicHref } from "@/i18n/config";
import { appUrlFromPublic } from "@/lib/sites";

/** The public site's 404 (canvas v3 "Hibaoldalak", signed out): to the home page, or sign in to the app. */
export default async function NotFound() {
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const [t, c, h] = await Promise.all([getTranslations("errors"), getTranslations("common"), headers()]);
  const home = publicHref("home", locale);
  return (
    <ErrorFrame home={home} homeLabel={c("homeLink")} language={<LanguageSwitch locale={locale} page="home" />} footer={<AppFooter />}>
      <ErrorState
        kind="notFound"
        eyebrow={t("notFound.eyebrow")}
        title={t("notFound.title")}
        lead={t("notFound.lead")}
        primary={{ href: home, label: t("site") }}
        secondary={{ href: appUrlFromPublic("portal", "/login", h.get("host")), label: t("signIn") }}
      />
    </ErrorFrame>
  );
}
