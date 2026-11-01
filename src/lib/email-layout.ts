/**
 * The one layout of every Keyfly email except the newsletter (approved design: canvas page "Levelek v2.2 – tranzakciós").
 * Compact App v2.2 look: logo, a white card with an optional status tag, title, lead, a details table, a note, one
 * ink button, then why you got it and the company footer on the paper ground.
 *
 * Light only, on purpose: `color-scheme: light only` keeps Apple Mail from repainting it, and the colours are neutral,
 * so clients that force a dark mode (Gmail app, Outlook) produce grey, never a green tint. No web fonts (no request to a
 * font host from the reader's mail client); the logo is the only image and the email reads fine without it.
 *
 * No imports, so the Supabase template script (plain Node) can use it too. Company facts come in as arguments
 * from src/config/company.ts.
 */

export type EmailTone = "ok" | "warning" | "info" | "neutral";

export type EmailCompany = {
  shortName: string;
  address: string;
  registrationNumber: string;
  taxNumber: string;
  support: string;
  siteUrl: string;
  privacyUrl: string;
};

export type EmailLabels = {
  /** "Nem működik a gomb? Másold be ezt a linket a böngésződbe:" */
  fallback: string;
  privacy: string;
  support: string;
  /** "Cg." / "Reg. no." */
  registration: string;
  taxNumber: string;
};

export type EmailContent = {
  lang: string;
  subject: string;
  preheader: string;
  tag?: { tone: EmailTone; label: string };
  title: string;
  lead: string;
  rows?: [string, string][];
  note?: string;
  /** The button; a notice that needs no action has none. */
  action?: { cta: string; url: string };
  /** "The invitation is valid until …" – under the button. */
  validity?: string;
  /** Sign-in emails: "Keyfly will never ask for your password by email." */
  security?: string;
  why: string;
  labels: EmailLabels;
  company: EmailCompany;
};

/** Design-system colours (mirror globals.css tokens – email clients cannot read CSS variables). */
const C = {
  ink: "#0C1F19",
  inkSoft: "#2E3D37",
  muted: "#4D5B55",
  paper: "#F5F7F2",
  surface: "#FFFFFF",
  line: "#DCE3DD",
  brand: "#0E5A43",
} as const;

const TONES: Record<EmailTone, [string, string]> = {
  ok: ["#E7F3EA", "#1B5E3B"],
  warning: ["#FDF1DC", "#7A4B00"],
  info: ["#E6ECFB", "#23408E"],
  neutral: ["#EEF1ED", "#3F4B45"],
};

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const e = escapeHtml;

function legalLine(c: EmailContent): string[] {
  const { company: k, labels: l } = c;
  return [k.shortName, k.address, `${l.registration} ${k.registrationNumber}`, `${l.taxNumber}: ${k.taxNumber}`];
}

export function renderEmailHtml(c: EmailContent): string {
  const tag = c.tag
    ? `<tr><td style="padding:0 0 12px;"><span style="display:inline-block;padding:3px 8px;border-radius:6px;background:${TONES[c.tag.tone][0]};color:${TONES[c.tag.tone][1]};font:600 12px/16px ${SANS};">${e(c.tag.label)}</span></td></tr>`
    : "";

  const rows = c.rows?.length
    ? `<tr><td style="padding:20px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid ${C.line};border-radius:8px;">${c.rows
        .map(([label, value], i) => {
          const top = i ? `border-top:1px solid ${C.line};` : "";
          return `
        <tr>
          <td class="kf-cell kf-label" style="padding:10px 14px;${top}font:14px/20px ${SANS};color:${C.muted};white-space:nowrap;">${e(label)}</td>
          <td class="kf-cell kf-value" align="right" style="padding:10px 14px;${top}font:600 14px/20px ${SANS};color:${C.ink};text-align:right;overflow-wrap:anywhere;">${e(value)}</td>
        </tr>`;
        })
        .join("")}
      </table>
    </td></tr>`
    : "";

  const note = c.note
    ? `<tr><td style="padding:12px 0 0;"><div style="padding:10px 14px;border-radius:8px;background:${C.paper};font:13px/20px ${SANS};color:${C.inkSoft};">${e(c.note)}</div></td></tr>`
    : "";

  const action = c.action
    ? `<tr><td style="padding:24px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.ink}" style="border-radius:8px;">
        <a href="${e(c.action.url)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:${C.ink};color:#FFFFFF;text-decoration:none;font:600 14px/20px ${SANS};">${e(c.action.cta)}</a>
      </td></tr></table>
    </td></tr>${c.validity ? `\n    <tr><td style="padding:12px 0 0;font:13px/20px ${SANS};color:${C.muted};">${e(c.validity)}</td></tr>` : ""}
    <tr><td style="padding:24px 0 0;">
      <div style="border-top:1px solid ${C.line};padding-top:16px;font:12px/18px ${SANS};color:${C.muted};">
        ${e(c.labels.fallback)}<br>
        <a href="${e(c.action.url)}" style="color:${C.brand};word-break:break-all;">${e(c.action.url)}</a>${c.security ? `<br><br>${e(c.security)}` : ""}
      </div>
    </td></tr>`
    : "";

  const k = c.company;
  return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${e(c.subject)}</title>
<style>
  :root { color-scheme: light only; supported-color-schemes: light; }
  @media (max-width: 600px) {
    .kf-pad { padding: 24px 20px !important; }
    .kf-cell { display: block !important; width: auto !important; text-align: left !important; white-space: normal !important; }
    .kf-label { padding-bottom: 2px !important; }
    .kf-value { border-top: 0 !important; padding-top: 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
<tr><td align="center" style="padding:24px 12px 32px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">
  <tr><td style="padding:0 0 16px 2px;"><a href="${e(k.siteUrl)}"><img src="${e(k.siteUrl)}/email/logo-pill.png" width="76" height="28" alt="Keyfly" style="display:block;border:0;"></a></td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface};border:1px solid ${C.line};border-radius:12px;border-collapse:separate;">
    <tr><td class="kf-pad" style="padding:32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${tag}
        <tr><td><h1 style="margin:0;font:600 22px/28px ${SANS};letter-spacing:-0.3px;color:${C.ink};">${e(c.title)}</h1></td></tr>
        <tr><td style="padding:10px 0 0;font:15px/24px ${SANS};color:${C.inkSoft};">${e(c.lead)}</td></tr>
        ${rows}${note}${action}
      </table>
    </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 4px 0;font:12px/18px ${SANS};color:${C.muted};">
    ${e(c.why)}<br><br>
    <a href="${e(k.privacyUrl)}" style="color:${C.muted};">${e(c.labels.privacy)}</a> · ${e(c.labels.support)}: <a href="mailto:${e(k.support)}" style="color:${C.muted};">${e(k.support)}</a><br>
    ${legalLine(c)
      .map((part) => `<span style="white-space:nowrap;">${e(part)}</span>`)
      .join(" · ")}
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function renderEmailText(c: EmailContent): string {
  return [
    c.title,
    "",
    c.lead,
    ...(c.rows?.length ? ["", ...c.rows.map(([label, value]) => `${label}: ${value}`)] : []),
    ...(c.note ? ["", c.note] : []),
    ...(c.action ? ["", `${c.action.cta}: ${c.action.url}`] : []),
    ...(c.validity ? [c.validity] : []),
    ...(c.security ? ["", c.security] : []),
    "",
    "--",
    c.why,
    `${c.labels.privacy}: ${c.company.privacyUrl}`,
    `${c.labels.support}: ${c.company.support}`,
    legalLine(c).join(" · "),
  ].join("\n");
}
