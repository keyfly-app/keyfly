import "server-only";
import { createTranslator } from "next-intl";
import { BRAND, COMPANY, formatCompanyAddress } from "@/config/company";
import { publicHref, type Locale } from "@/i18n/config";
import type { Enums } from "@/lib/supabase/database.types";
import { date } from "@/lib/format";
import hu from "../../../messages/hu.json";
import en from "../../../messages/en.json";

/** Design-system colours (mirror globals.css tokens – email clients cannot read CSS variables). */
const C = {
  ink: "#0C1F19",
  inkSoft: "#2E3D37",
  muted: "#4D5B55",
  paper: "#F5F7F2",
  surface: "#FFFFFF",
  line: "#DCE3DD",
  brand: "#0E5A43",
  lime: "#C9F27B",
  limeSoft: "#EAF8D0",
} as const;

const SANS = "Arial, Helvetica, sans-serif";
const DISPLAY = "Sora, Arial, Helvetica, sans-serif";
const STEPS = ["notify", "offer", "move"] as const;

type Input = {
  locale: Locale;
  email: string;
  segment: Enums<"waitlist_segment">;
  newsletter: boolean;
  signedUpAt: Date;
};

/**
 * Waitlist confirmation email (approved design: canvas "Visszaigazoló levél").
 * Light-first on purpose: Gmail's mobile dark mode inverts colours but not images, so the hero is a light card
 * (inverts to dark cleanly) and the images are self-contained (logo in a dark pill, brand mark) with transparent edges.
 */
export function waitlistConfirmationEmail({ locale, email, segment, newsletter, signedUpAt }: Input) {
  const messages = locale === "en" ? en : hu;
  const t = createTranslator({ locale, messages, namespace: "emails.waitlistConfirmation" });
  const segments = createTranslator({ locale, messages, namespace: "waitlist.segments" });
  const url = (path: string) => `${BRAND.url}${path}`;
  const howItWorks = url(`${publicHref("home", locale)}#steps-title`);
  const privacy = url(publicHref("privacy", locale));
  const legal = `${COMPANY.shortName} · ${formatCompanyAddress()} · Cg. ${COMPANY.registrationNumber}`;

  const rows: [string, string][] = [
    [t("rows.email"), email],
    [t("rows.segment"), segments(segment)],
    [t("rows.newsletter"), newsletter ? t("newsletterYes") : t("newsletterNo")],
    [t("rows.date"), date(signedUpAt.toISOString(), locale)],
  ];

  const summary = rows
    .map(
      ([label, value]) => `
        <tr>
          <td class="kf-muted kf-line kf-cell" style="padding:12px 12px 12px 0;border-top:1px solid ${C.line};font:15px/1.4 ${SANS};color:${C.muted};">${esc(label)}</td>
          <td class="kf-text kf-line kf-cell kf-value" align="right" style="padding:12px 0;border-top:1px solid ${C.line};font:bold 15px/1.4 ${SANS};color:${C.ink};overflow-wrap:anywhere;">${esc(value)}</td>
        </tr>`,
    )
    .join("");

  const steps = STEPS.map(
    (key, i) => `
        <tr>
          <td valign="top" width="52" style="padding:0 0 18px;">
            <div style="width:36px;height:36px;line-height:36px;border-radius:10px;background:${C.lime};color:${C.ink};font:bold 15px/36px ${DISPLAY};text-align:center;">${i + 1}</div>
          </td>
          <td valign="top" style="padding:0 0 18px;">
            <div class="kf-text" style="font:bold 16px/1.4 ${DISPLAY};color:${C.ink};">${esc(t(`steps.${key}.title`))}</div>
            <div class="kf-muted" style="font:15px/1.5 ${SANS};color:${C.muted};">${esc(t(`steps.${key}.text`))}</div>
          </td>
        </tr>`,
  ).join("");

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(t("subject"))}</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@700&display=swap" rel="stylesheet">
<style>
  @media (prefers-color-scheme: dark) {
    .kf-bg { background: #081510 !important; }
    .kf-card { background: #0F2219 !important; border-color: #24392F !important; }
    .kf-text { color: #EEF3EF !important; }
    .kf-muted { color: #A9B8B0 !important; }
    .kf-line { border-color: #24392F !important; }
    .kf-hero { background: #1B342C !important; }
    .kf-hero-text { color: #FFFFFF !important; }
    .kf-hero-accent { color: ${C.lime} !important; }
    .kf-hero-muted { color: #C7D3CC !important; }
  }
  @media (max-width: 620px) {
    .kf-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .kf-cell { display: block !important; width: auto !important; text-align: left !important; }
    .kf-value { border-top: 0 !important; padding-top: 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.paper};" class="kf-bg">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(t("preheader"))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};" class="kf-bg">
<tr><td align="center" style="padding:16px 8px 32px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

  <tr><td class="kf-hero kf-pad" style="background:${C.limeSoft};border-radius:28px;padding:24px 40px 44px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><img src="${url("/email/logo-pill.png")}" width="104" height="38" alt="Keyfly" style="display:block;border:0;"></td>
      <td align="right" class="kf-hero-muted" style="font:bold 11px ${SANS};letter-spacing:1.4px;color:${C.inkSoft};">${esc(t("label"))}</td>
    </tr></table>
    <img src="${url("/email/mark.png")}" width="56" height="56" alt="" style="display:block;border:0;margin-top:24px;">
    <h1 class="kf-hero-text" style="margin:18px 0 0;font:bold 44px/1.04 ${DISPLAY};letter-spacing:-1.2px;color:${C.ink};">${esc(t("titleStart"))} <span class="kf-hero-accent" style="color:${C.brand};white-space:nowrap;">${esc(t("titleHighlight"))}</span></h1>
    <p class="kf-hero-muted" style="margin:16px 0 0;font:16px/1.6 ${SANS};color:${C.inkSoft};">${esc(t("lead"))}</p>
  </td></tr>

  <tr><td style="padding:24px 16px 0;" class="kf-pad">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="kf-card" style="background:${C.surface};border:1px solid ${C.line};border-radius:22px;">
      <tr><td style="padding:20px 22px 8px;">
        <div class="kf-text" style="padding-bottom:12px;font:bold 17px/1.3 ${DISPLAY};color:${C.ink};">${esc(t("summaryTitle"))}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summary}</table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:32px 40px 0;" class="kf-pad">
    <div class="kf-text" style="padding-bottom:18px;font:bold 22px/1.3 ${DISPLAY};letter-spacing:-0.4px;color:${C.ink};">${esc(t("nextTitle"))}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps}</table>
    <a href="${howItWorks}" style="display:inline-block;margin-top:6px;background:${C.brand};color:#FFFFFF;text-decoration:none;font:bold 16px ${SANS};padding:15px 26px;border-radius:999px;">${esc(t("cta"))}</a>
  </td></tr>

  <tr><td style="padding:32px 40px 0;font:16px/1.6 ${SANS};color:${C.ink};" class="kf-pad kf-text">
    ${esc(t("note"))}<br><br><b>${esc(t("signName"))}</b>, <span class="kf-muted" style="color:${C.muted};">${esc(t("signRole"))}</span>
  </td></tr>

  <tr><td style="padding:28px 40px 8px;" class="kf-pad">
    <div class="kf-muted kf-line" style="border-top:1px solid ${C.line};padding-top:22px;font:12px/1.6 ${SANS};color:${C.muted};">
      ${esc(t("why"))}<br>
      <a href="${privacy}" style="color:${C.muted};">${esc(t("privacy"))}</a> · <a href="${BRAND.url}" style="color:${C.muted};">${BRAND.domain}</a><br>
      ${esc(legal)}
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `${t("titleStart")} ${t("titleHighlight")}`,
    "",
    t("lead"),
    "",
    `${t("summaryTitle")}:`,
    ...rows.map(([label, value]) => `- ${label}: ${value}`),
    "",
    `${t("nextTitle")}`,
    ...STEPS.map((key, i) => `${i + 1}. ${t(`steps.${key}.title`)} – ${t(`steps.${key}.text`)}`),
    "",
    `${t("cta")}: ${howItWorks}`,
    "",
    t("note"),
    `${t("signName")}, ${t("signRole")}`,
    "",
    "--",
    t("why"),
    `${t("privacy")}: ${privacy}`,
    legal,
  ].join("\n");

  return { subject: t("subject"), html, text };
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
