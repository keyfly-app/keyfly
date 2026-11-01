import "server-only";
import { createTranslator } from "next-intl";
import { BRAND } from "@/config/company";
import { publicHref, type Locale } from "@/i18n/config";
import { emailCompany, emailLabels } from "@/lib/email";
import { renderEmailHtml, renderEmailText, type EmailContent } from "@/lib/email-layout";
import type { Enums } from "@/lib/supabase/database.types";
import { date } from "@/lib/format";
import hu from "../../../messages/hu.json";
import en from "../../../messages/en.json";

type Input = {
  locale: Locale;
  email: string;
  segment: Enums<"waitlist_segment">;
  newsletter: boolean;
  signedUpAt: Date;
};

/** Waitlist confirmation in the shared transactional layout (canvas page "Levelek v2.2 – tranzakciós"). */
export function waitlistConfirmationEmail({ locale, email, segment, newsletter, signedUpAt }: Input) {
  const messages = locale === "en" ? en : hu;
  const t = createTranslator({ locale, messages, namespace: "emails.waitlistConfirmation" });
  const segments = createTranslator({ locale, messages, namespace: "waitlist.segments" });

  const content: EmailContent = {
    lang: locale,
    subject: t("subject"),
    preheader: t("preheader"),
    tag: { tone: "ok", label: t("tag") },
    title: t("title"),
    lead: t("lead"),
    rows: [
      [t("rows.email"), email],
      [t("rows.segment"), segments(segment)],
      [t("rows.newsletter"), newsletter ? t("newsletterYes") : t("newsletterNo")],
      [t("rows.date"), date(signedUpAt.toISOString(), locale)],
    ],
    note: t("note"),
    action: { cta: t("cta"), url: `${BRAND.url}${publicHref("home", locale)}#steps-title` },
    why: t("why"),
    labels: emailLabels(locale),
    company: emailCompany(locale),
  };
  return { subject: content.subject, html: renderEmailHtml(content), text: renderEmailText(content) };
}
