// Builds the Supabase Auth email templates (approved design: canvas board "AuthLevelek") from the message files
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

type Locale = "hu" | "en";
type Kind = "confirmation" | "magicLink" | "recovery";
type Copy = Record<"fallback" | "privacy" | "taxNumber" | "validity", string> &
  Record<Kind, Record<"subject" | "preheader" | "title" | "lead" | "cta" | "why", string>>;

const load = (l: Locale): Copy => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf8")).authEmails;
const COPY: Record<Locale, Copy> = { hu: load("hu"), en: load("en") };

/** Supabase file name, and the `type` the app's /auth/confirm passes to verifyOtp. */
const TYPES: Record<Kind, { file: string; otpType: string }> = {
  confirmation: { file: "confirmation", otpType: "signup" },
  magicLink: { file: "magic_link", otpType: "magiclink" },
  recovery: { file: "recovery", otpType: "recovery" },
};

/** Design-system colours (mirror globals.css – email clients cannot read CSS variables). */
const C = { ink: "#0C1F19", inkSoft: "#2E3D37", muted: "#4D5B55", paper: "#F5F7F2", surface: "#FFFFFF", line: "#DCE3DD", brand: "#0E5A43" };
const SANS = "Arial, Helvetica, sans-serif";
const DISPLAY = "Sora, Arial, Helvetica, sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const byLocale = (hu: string, en: string) => `{{ if eq .Data.locale "en" }}${en}{{ else }}${hu}{{ end }}`;

function body(kind: Kind, locale: Locale) {
  const t = COPY[locale];
  const m = t[kind];
  const link = `{{ .RedirectTo }}&amp;type=${TYPES[kind].otpType}&amp;token_hash={{ .TokenHash }}`;
  const legal = `${COMPANY.shortName} · ${formatCompanyAddress()} · Cg. ${COMPANY.registrationNumber} · ${t.taxNumber} ${COMPANY.taxNumber}`;
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(m.subject)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .kf-bg { background: #081510 !important; }
    .kf-card { background: #0F2219 !important; border-color: #24392F !important; }
    .kf-text { color: #EEF3EF !important; }
    .kf-muted { color: #A9B8B0 !important; }
    .kf-line { border-color: #24392F !important; }
  }
  @media (max-width: 620px) { .kf-pad { padding-left: 22px !important; padding-right: 22px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:${C.paper};" class="kf-bg">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(m.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};" class="kf-bg">
<tr><td align="center" style="padding:24px 8px 32px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" class="kf-card" style="width:100%;max-width:600px;background:${C.surface};border:1px solid ${C.line};border-radius:20px;">
  <tr><td class="kf-pad" style="padding:36px 40px 0;">
    <img src="${BRAND.url}/email/logo-pill.png" width="104" height="38" alt="${BRAND.name}" style="display:block;border:0;">
    <h1 class="kf-text" style="margin:24px 0 0;font:bold 26px/1.2 ${DISPLAY};letter-spacing:-0.4px;color:${C.ink};">${esc(m.title)}</h1>
    <p class="kf-text" style="margin:16px 0 0;font:16px/1.6 ${SANS};color:${C.inkSoft};">${esc(m.lead)}</p>
  </td></tr>
  <tr><td class="kf-pad" style="padding:24px 40px 0;">
    <a href="${link}" style="display:inline-block;background:${C.brand};color:#FFFFFF;text-decoration:none;font:bold 16px ${SANS};padding:15px 26px;border-radius:999px;">${esc(m.cta)}</a>
    <p class="kf-muted" style="margin:16px 0 0;font:14px/1.5 ${SANS};color:${C.muted};">${esc(t.validity)}</p>
    <p class="kf-muted" style="margin:16px 0 0;font:13px/1.55 ${SANS};color:${C.muted};">${esc(t.fallback)}<br>
      <a href="${link}" style="color:${C.brand};word-break:break-all;">${link}</a></p>
  </td></tr>
  <tr><td class="kf-pad" style="padding:28px 40px 32px;">
    <div class="kf-muted kf-line" style="border-top:1px solid ${C.line};padding-top:18px;font:12px/1.6 ${SANS};color:${C.muted};">
      ${esc(m.why)}<br><br>
      <a href="${BRAND.url}${publicHref("privacy", locale)}" style="color:${C.muted};">${esc(t.privacy)}</a> ·
      <a href="${BRAND.url}${publicHref("home", locale)}" style="color:${C.muted};">${BRAND.domain}</a> ·
      <a href="mailto:${CONTACT.support}" style="color:${C.muted};">${CONTACT.support}</a><br>
      ${esc(legal)}
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const out = new URL("../supabase/templates/", import.meta.url);
mkdirSync(out, { recursive: true });
const subjects: Record<string, string> = {};
for (const kind of Object.keys(TYPES) as Kind[]) {
  const { file } = TYPES[kind];
  writeFileSync(new URL(`${file}.html`, out), byLocale(body(kind, "hu"), body(kind, "en")) + "\n");
  subjects[file] = byLocale(COPY.hu[kind].subject, COPY.en[kind].subject);
}
writeFileSync(new URL("subjects.json", out), JSON.stringify(subjects, null, 2) + "\n");
console.log(`auth email templates written: ${Object.values(TYPES).map((t) => t.file).join(", ")}`);
