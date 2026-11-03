import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { ErrorFrame, ErrorState } from "@/components/ErrorState";
import { CONTACT } from "@/config/company";
import { LanguageMenu } from "@/features/language/LanguageMenu";
import { siteHref } from "@/lib/site-href";

/** The admin 404 (canvas v3 "Hibaoldalak"): back to the Overview, which asks for sign-in when needed. */
export default async function NotFound() {
  const [t, c, home] = await Promise.all([getTranslations("errors"), getTranslations("common"), siteHref("admin", "/")]);
  return (
    <ErrorFrame
      home={home}
      homeLabel={c("homeLink")}
      language={
        <Suspense>
          <LanguageMenu />
        </Suspense>
      }
      footer={<AppFooter />}
    >
      <ErrorState
        kind="notFound"
        eyebrow={t("notFound.eyebrow")}
        title={t("notFound.title")}
        lead={t("notFound.lead")}
        primary={{ href: home, label: t("home"), icon: "back" }}
        secondary={{ href: `mailto:${CONTACT.support}`, label: t("write") }}
      />
    </ErrorFrame>
  );
}
