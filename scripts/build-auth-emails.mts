// Builds the Supabase Auth email templates (approved design: canvas page "Levelek v2.2 – tranzakciós") from the message files
// and company facts, so the copy has one source. Supabase sends one template per email type, so each file holds
// both languages and picks one with the user's `locale` (user metadata; Hungarian when it is missing).
//
//   npm run email:auth   → supabase/templates/<type>.html + supabase/templates/subjects.json
//
// Then paste each file into Supabase → Authentication → Emails → Templates (staging and production) with the
// subject from subjects.json. The links go to the app's /auth/confirm, which verifies the token hash.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BRAND, COMPANY, CONTACT, formatCompanyAddress } from "../src/config/company.ts";
import { publicHref } from "../src/i18n/config.ts";
import { renderEmailHtml, type EmailContent } from "../src/lib/email-layout.ts";

type Locale = "hu" | "en";
type Kind = "confirmation" | "magicLink" | "recovery";
type Messages = {
  emailLayout: EmailContent["labels"];
  authEmails: Record<"validity" | "security", string> & Record<Kind, Record<"tag" | "subject" | "preheader" | "title" | "lead" | "cta" | "why", string>>;
};

const load = (l: Locale): Messages => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf8"));
const COPY: Record<Locale, Messages> = { hu: load("hu"), en: load("en") };

/** Supabase file name, and the `type` the app's /auth/confirm passes to verifyOtp. */
const TYPES: Record<Kind, { file: string; otpType: string }> = {
  confirmation: { file: "confirmation", otpType: "signup" },
  magicLink: { file: "magic_link", otpType: "magiclink" },
  recovery: { file: "recovery", otpType: "recovery" },
};

const byLocale = (hu: string, en: string) => `{{ if eq .Data.locale "en" }}${en}{{ else }}${hu}{{ end }}`;

function body(kind: Kind, locale: Locale) {
  const { authEmails: t, emailLayout: labels } = COPY[locale];
  const m = t[kind];
  return renderEmailHtml({
    lang: locale,
    subject: m.subject,
    preheader: m.preheader,
    tag: { tone: "neutral", label: m.tag },
    title: m.title,
    lead: m.lead,
    // Go template placeholders filled in by Supabase; the layout escapes & to &amp;.
    action: { cta: m.cta, url: `{{ .RedirectTo }}&type=${TYPES[kind].otpType}&token_hash={{ .TokenHash }}` },
    validity: t.validity,
    security: t.security,
    why: m.why,
    labels,
    company: {
      shortName: COMPANY.shortName,
      address: formatCompanyAddress(),
      registrationNumber: COMPANY.registrationNumber,
      taxNumber: COMPANY.taxNumber,
      support: CONTACT.support,
      siteUrl: BRAND.url,
      privacyUrl: `${BRAND.url}${publicHref("privacy", locale)}`,
    },
  });
}

const out = new URL("../supabase/templates/", import.meta.url);
mkdirSync(out, { recursive: true });
const subjects: Record<string, string> = {};
for (const kind of Object.keys(TYPES) as Kind[]) {
  const { file } = TYPES[kind];
  writeFileSync(new URL(`${file}.html`, out), byLocale(body(kind, "hu"), body(kind, "en")) + "\n");
  subjects[file] = byLocale(COPY.hu.authEmails[kind].subject, COPY.en.authEmails[kind].subject);
}
writeFileSync(new URL("subjects.json", out), JSON.stringify(subjects, null, 2) + "\n");
console.log(`auth email templates written: ${Object.values(TYPES).map((t) => t.file).join(", ")}`);
