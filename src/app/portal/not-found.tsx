import { Suspense } from "react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AppFooter } from "@/components/AppFooter";
import { ErrorFrame, ErrorState } from "@/components/ErrorState";
import { Shell } from "@/components/Shell";
import { CONTACT } from "@/config/company";
import { LanguageMenu } from "@/features/language/LanguageMenu";
import { currentUser } from "@/features/settings/current-user";
import { siteHref } from "@/lib/site-href";
import { marketingOrigin } from "@/lib/sites";

/** The app's 404 (canvas v3 "Hibaoldalak"): signed in inside the app frame, signed out with the logo and language only. */
export default async function NotFound() {
  const [t, c, user, home, login, h] = await Promise.all([
    getTranslations("errors"),
    getTranslations("common"),
    currentUser(),
    siteHref("portal", "/"),
    siteHref("portal", "/login"),
    headers(),
  ]);
  const content = { kind: "notFound" as const, eyebrow: t("notFound.eyebrow"), title: t("notFound.title"), lead: t("notFound.lead") };
  if (user) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center py-6 sm:py-10">
          <ErrorState {...content} primary={{ href: home, label: t("home"), icon: "back" }} secondary={{ href: `mailto:${CONTACT.support}`, label: t("write") }} />
        </div>
      </Shell>
    );
  }
  const site = marketingOrigin(h.get("host"));
  return (
    <ErrorFrame
      home={site}
      homeLabel={c("homeLink")}
      language={
        <Suspense>
          <LanguageMenu />
        </Suspense>
      }
      footer={<AppFooter />}
    >
      <ErrorState {...content} primary={{ href: site, label: t("site") }} secondary={{ href: login, label: t("signIn") }} />
    </ErrorFrame>
  );
}
