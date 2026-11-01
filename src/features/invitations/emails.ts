import "server-only";
import { createTranslator } from "next-intl";
import { BRAND, COMPANY, CONTACT, formatCompanyAddress } from "@/config/company";
import { publicHref, type Locale } from "@/i18n/config";
import { dateBeforeSuffix, date, money } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
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
} as const;
const SANS = "Arial, Helvetica, sans-serif";
const DISPLAY = "Sora, Arial, Helvetica, sans-serif";

export type Email = { subject: string; html: string; text: string };

type Content = {
  locale: Locale;
  subject: string;
  preheader: string;
  title: string;
  lead: string;
  rows?: [string, string][];
  note?: string;
  cta: string;
  url: string;
  /** "The invitation is valid until …" – notifications have none. */
  validity?: string;
  why: string;
};

const translator = (locale: Locale) => createTranslator({ locale, messages: locale === "en" ? en : hu, namespace: "invitationEmails" });

/**
 * One layout for every invitation and lease notification (approved design: canvas "Hitelesítési és meghívó levelek").
 * Single 600 px column: logo, title, lead, optional details, one button, the plain link as a fallback, why you got it, company footer.
 * The logo sits in a dark pill so it survives dark-mode inversion; no other images, so nothing is lost when images are blocked.
 */
function render(content: Content): Email {
  // A sentence that ends in a name or address that already ends in a dot ("Kft.", "3. em. 8.") gets no second dot.
  const c = { ...content, lead: tidy(content.lead), preheader: tidy(content.preheader), note: content.note && tidy(content.note) };
  const t = translator(c.locale);
  const privacy = `${BRAND.url}${publicHref("privacy", c.locale)}`;
  const legal = `${COMPANY.shortName} · ${formatCompanyAddress()} · Cg. ${COMPANY.registrationNumber} · ${t("common.taxNumber")}: ${COMPANY.taxNumber}`;

  const rows = c.rows?.length
    ? `<tr><td style="padding:20px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="kf-line" style="border:1px solid ${C.line};border-radius:14px;">
          <tr><td style="padding:4px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${c.rows
              .map(
                ([label, value], i) => `
              <tr>
                <td class="kf-muted kf-line kf-cell" style="padding:10px 12px 10px 0;${i ? `border-top:1px solid ${C.line};` : ""}font:15px/1.4 ${SANS};color:${C.muted};">${esc(label)}</td>
                <td class="kf-text kf-line kf-cell kf-value" align="right" style="padding:10px 0;${i ? `border-top:1px solid ${C.line};` : ""}font:bold 15px/1.4 ${SANS};color:${C.ink};overflow-wrap:anywhere;">${esc(value)}</td>
              </tr>`,
              )
              .join("")}
            </table>
          </td></tr>
        </table>
      </td></tr>`
    : "";
  const note = c.note ? `<tr><td class="kf-soft" style="padding:20px 0 0;font:15px/1.6 ${SANS};color:${C.inkSoft};">${esc(c.note)}</td></tr>` : "";
  const validity = c.validity ? `<tr><td class="kf-muted" style="padding:14px 0 0;font:14px/1.5 ${SANS};color:${C.muted};">${esc(c.validity)}</td></tr>` : "";

  const html = `<!doctype html>
<html lang="${c.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(c.subject)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .kf-bg { background: #081510 !important; }
    .kf-card { background: #0F2219 !important; border-color: #24392F !important; }
    .kf-text { color: #EEF3EF !important; }
    .kf-soft { color: #C7D3CC !important; }
    .kf-muted { color: #A9B8B0 !important; }
    .kf-line { border-color: #24392F !important; }
    .kf-link { color: #C9F27B !important; }
  }
  @media (max-width: 620px) {
    .kf-pad { padding: 28px 22px !important; }
    .kf-cell { display: block !important; width: auto !important; text-align: left !important; }
    .kf-value { border-top: 0 !important; padding-top: 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.paper};" class="kf-bg">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};" class="kf-bg">
<tr><td align="center" style="padding:16px 8px 32px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" class="kf-card" style="width:100%;max-width:600px;background:${C.surface};border:1px solid ${C.line};border-radius:20px;">
<tr><td class="kf-pad" style="padding:36px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td><img src="${BRAND.url}/email/logo-pill.png" width="104" height="38" alt="${BRAND.name}" style="display:block;border:0;"></td></tr>
    <tr><td style="padding:24px 0 0;"><h1 class="kf-text" style="margin:0;font:bold 26px/1.2 ${DISPLAY};letter-spacing:-0.4px;color:${C.ink};">${esc(c.title)}</h1></td></tr>
    <tr><td class="kf-soft" style="padding:14px 0 0;font:16px/1.6 ${SANS};color:${C.inkSoft};">${esc(c.lead)}</td></tr>
    ${rows}${note}
    <tr><td style="padding:24px 0 0;">
      <a href="${esc(c.url)}" style="display:inline-block;background:${C.brand};color:#FFFFFF;text-decoration:none;font:bold 16px ${SANS};padding:15px 26px;border-radius:999px;">${esc(c.cta)}</a>
    </td></tr>
    ${validity}
    <tr><td class="kf-muted" style="padding:14px 0 0;font:13px/1.55 ${SANS};color:${C.muted};">
      ${esc(t("common.fallback"))}<br>
      <a href="${esc(c.url)}" class="kf-link" style="color:${C.brand};word-break:break-all;">${esc(c.url)}</a>
    </td></tr>
    <tr><td style="padding:24px 0 0;">
      <div class="kf-muted kf-line" style="border-top:1px solid ${C.line};padding-top:18px;font:12px/1.6 ${SANS};color:${C.muted};">
        ${esc(c.why)}<br>
        <a href="${privacy}" style="color:${C.muted};">${esc(t("common.privacy"))}</a> · <a href="${BRAND.url}" style="color:${C.muted};">${BRAND.domain}</a> · <a href="mailto:${CONTACT.support}" style="color:${C.muted};">${CONTACT.support}</a><br>
        ${esc(legal)}
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    c.title,
    "",
    c.lead,
    ...(c.rows?.length ? ["", ...c.rows.map(([label, value]) => `${label}: ${value}`)] : []),
    ...(c.note ? ["", c.note] : []),
    "",
    `${c.cta}: ${c.url}`,
    ...(c.validity ? [c.validity] : []),
    "",
    "--",
    c.why,
    `${t("common.privacy")}: ${privacy}`,
    legal,
  ].join("\n");

  return { subject: c.subject, html, text };
}

const tidy = (value: string) => value.replace(/\.\.$/, ".");

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const validUntil = (locale: Locale, expiresAt: string) => translator(locale)("common.validUntil", { date: dateBeforeSuffix(expiresAt, locale) });

type LeaseTerms = { address: string; monthlyRent: number; startDate: string; endDate?: string | null };

function termRows(locale: Locale, lease: LeaseTerms, withEnd: boolean): [string, string][] {
  const t = translator(locale);
  const rows: [string, string][] = [
    [t("common.rows.property"), lease.address],
    [t("common.rows.rent"), money(lease.monthlyRent, locale)],
    [t("common.rows.start"), date(lease.startDate, locale)],
  ];
  if (withEnd) rows.push([t("common.rows.end"), lease.endDate ? date(lease.endDate, locale) : t("common.openEnded")]);
  return rows;
}

// ---------- Invitations ------------------------------------------------------------------

export function teamMemberEmail(i: {
  locale: Locale;
  url: string;
  expiresAt: string;
  inviter: string;
  account: string;
  role: Enums<"account_role">;
  propertyCount: number | null;
  email: string;
}): Email {
  const t = translator(i.locale);
  const roles = createTranslator({ locale: i.locale, messages: i.locale === "en" ? en : hu, namespace: "invite.roles" });
  return render({
    locale: i.locale,
    subject: t("member.subject", { account: i.account }),
    preheader: t("member.preheader", { name: i.inviter }),
    title: t("member.title"),
    lead: t("member.lead", { name: i.inviter, account: i.account }),
    rows: [
      [t("common.rows.account"), i.account],
      [t("common.rows.role"), roles(i.role)],
      [t("common.rows.access"), i.propertyCount == null ? t("common.accessAll") : t("common.accessSelected", { count: i.propertyCount })],
    ],
    note: t("common.signInNote", { email: i.email }),
    cta: t("member.cta"),
    url: i.url,
    validity: validUntil(i.locale, i.expiresAt),
    why: t("member.why", { name: i.inviter }),
  });
}

/** The landlord side invites the tenant to approve a lease. `landlord` is the managing account's name. */
export function leaseTenantEmail(i: { locale: Locale; url: string; expiresAt: string; landlord: string; lease: LeaseTerms; streetAddress: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    subject: t("tenant.subject", { address: i.streetAddress }),
    preheader: t("tenant.preheader", { name: i.landlord }),
    title: t("tenant.title"),
    lead: t("tenant.lead", { name: i.landlord }),
    rows: termRows(i.locale, i.lease, true),
    cta: t("tenant.cta"),
    url: i.url,
    validity: validUntil(i.locale, i.expiresAt),
    why: t("tenant.why", { name: i.landlord }),
  });
}

/** The tenant invites the landlord; a reminder sends the same email with a new link. */
export function landlordEmail(i: { locale: Locale; url: string; expiresAt: string; tenant: string; lease: LeaseTerms; reminder: boolean }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    subject: t(i.reminder ? "landlord.reminderSubject" : "landlord.subject", { name: i.tenant }),
    preheader: t("landlord.preheader"),
    title: t("landlord.title"),
    lead: t("landlord.lead", { name: i.tenant }),
    rows: termRows(i.locale, i.lease, false),
    note: t("landlord.note"),
    cta: t("landlord.cta"),
    url: i.url,
    validity: validUntil(i.locale, i.expiresAt),
    why: t("landlord.why", { name: i.tenant }),
  });
}

export function occupantEmail(i: { locale: Locale; url: string; expiresAt: string; inviter: string; role: Enums<"occupant_role">; address: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    subject: t("occupant.subject", { name: i.inviter }),
    preheader: t("occupant.preheader", { role: i.role }),
    title: t("occupant.title"),
    lead: t("occupant.lead", { name: i.inviter, role: i.role, address: i.address }),
    cta: t("occupant.cta"),
    url: i.url,
    validity: validUntil(i.locale, i.expiresAt),
    why: t("occupant.why", { name: i.inviter }),
  });
}

export function staffEmail(i: { locale: Locale; url: string; validHours: number; inviter: string; role: Enums<"staff_role"> }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    subject: t("staff.subject"),
    preheader: t("staff.preheader", { name: i.inviter }),
    title: t("staff.title"),
    lead: t("staff.lead", { name: i.inviter }),
    rows: [[t("common.rows.role"), t(`staff.roles.${i.role}`)]],
    note: t("staff.note"),
    cta: t("staff.cta"),
    url: i.url,
    validity: t("common.validHours", { hours: i.validHours }),
    why: t("staff.why"),
  });
}

// ---------- Notifications to the tenant who invited the landlord ---------------------------

export function leaseApprovedEmail(i: { locale: Locale; url: string; landlord: string; lease: LeaseTerms; streetAddress: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    subject: t("leaseApproved.subject", { address: i.streetAddress }),
    preheader: t("leaseApproved.preheader", { name: i.landlord }),
    title: t("leaseApproved.title"),
    lead: t("leaseApproved.lead", { name: i.landlord }),
    rows: termRows(i.locale, i.lease, true),
    cta: t("leaseApproved.cta"),
    url: i.url,
    why: t("leaseApproved.why"),
  });
}

export function termsChangedEmail(i: { locale: Locale; url: string; landlord: string; streetAddress: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    subject: t("termsChanged.subject", { address: i.streetAddress }),
    preheader: t("termsChanged.preheader"),
    title: t("termsChanged.title"),
    lead: t("termsChanged.lead", { name: i.landlord }),
    cta: t("termsChanged.cta"),
    url: i.url,
    why: t("termsChanged.why"),
  });
}
