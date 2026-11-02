import "server-only";
import { createTranslator } from "next-intl";
import { type Locale } from "@/i18n/config";
import { emailCompany, emailLabels } from "@/lib/email";
import { renderEmailHtml, renderEmailText, type EmailContent, type EmailTone } from "@/lib/email-layout";
import { dateBeforeSuffix, date, money, sentence } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
import hu from "../../../messages/hu.json";
import en from "../../../messages/en.json";

export type Email = { subject: string; html: string; text: string };

type Content = Omit<EmailContent, "lang" | "labels" | "company" | "tag"> & { locale: Locale; tag: { tone: EmailTone; label: string } };

const translator = (locale: Locale) => createTranslator({ locale, messages: locale === "en" ? en : hu, namespace: "invitationEmails" });

/** Every invitation and lease notification, in the shared email layout (src/lib/email-layout.ts). */
function render(content: Content): Email {
  // A sentence that ends in a name or address that already ends in a dot ("Kft.", "3. em. 8.") gets no second dot.
  const c: EmailContent = {
    ...content,
    lang: content.locale,
    lead: sentence(content.lead),
    preheader: sentence(content.preheader),
    note: content.note && sentence(content.note),
    labels: emailLabels(content.locale),
    company: emailCompany(content.locale),
  };
  return { subject: c.subject, html: renderEmailHtml(c), text: renderEmailText(c) };
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
    tag: { tone: "info", label: t("member.tag") },
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
    action: { cta: t("member.cta"), url: i.url },
    validity: validUntil(i.locale, i.expiresAt),
    why: t("member.why", { name: i.inviter }),
  });
}

/** The landlord side invites the tenant to approve a lease. `landlord` is the managing account's name. */
export function leaseTenantEmail(i: { locale: Locale; url: string; expiresAt: string; landlord: string; lease: LeaseTerms; streetAddress: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    tag: { tone: "info", label: t("tenant.tag") },
    subject: t("tenant.subject", { address: i.streetAddress }),
    preheader: t("tenant.preheader", { name: i.landlord }),
    title: t("tenant.title"),
    lead: t("tenant.lead", { name: i.landlord }),
    rows: termRows(i.locale, i.lease, true),
    action: { cta: t("tenant.cta"), url: i.url },
    validity: validUntil(i.locale, i.expiresAt),
    why: t("tenant.why", { name: i.landlord }),
  });
}

/** The tenant invites the landlord; a reminder sends the same email with a new link. */
export function landlordEmail(i: { locale: Locale; url: string; expiresAt: string; tenant: string; lease: LeaseTerms; reminder: boolean }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    tag: i.reminder ? { tone: "warning", label: t("landlord.reminderTag") } : { tone: "info", label: t("landlord.tag") },
    subject: t(i.reminder ? "landlord.reminderSubject" : "landlord.subject", { name: i.tenant }),
    preheader: t("landlord.preheader"),
    title: t("landlord.title"),
    lead: t("landlord.lead", { name: i.tenant }),
    rows: termRows(i.locale, i.lease, false),
    note: t("landlord.note"),
    action: { cta: t("landlord.cta"), url: i.url },
    validity: validUntil(i.locale, i.expiresAt),
    why: t("landlord.why", { name: i.tenant }),
  });
}

export function occupantEmail(i: { locale: Locale; url: string; expiresAt: string; inviter: string; role: Enums<"occupant_role">; address: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    tag: { tone: "info", label: t("occupant.tag") },
    subject: t("occupant.subject", { name: i.inviter }),
    preheader: t("occupant.preheader", { role: i.role }),
    title: t("occupant.title"),
    lead: t("occupant.lead", { name: i.inviter, role: i.role, address: i.address }),
    action: { cta: t("occupant.cta"), url: i.url },
    validity: validUntil(i.locale, i.expiresAt),
    why: t("occupant.why", { name: i.inviter }),
  });
}

export function staffEmail(i: { locale: Locale; url: string; validHours: number; inviter: string; role: Enums<"staff_role"> }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    tag: { tone: "info", label: t("staff.tag") },
    subject: t("staff.subject"),
    preheader: t("staff.preheader", { name: i.inviter }),
    title: t("staff.title"),
    lead: t("staff.lead", { name: i.inviter }),
    rows: [[t("common.rows.role"), t(`staff.roles.${i.role}`)]],
    note: t("staff.note"),
    action: { cta: t("staff.cta"), url: i.url },
    validity: t("common.validHours", { hours: i.validHours }),
    why: t("staff.why"),
  });
}

// ---------- Notifications to the tenant who invited the landlord ---------------------------

export function leaseApprovedEmail(i: { locale: Locale; url: string; landlord: string; lease: LeaseTerms; streetAddress: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    tag: { tone: "ok", label: t("leaseApproved.tag") },
    subject: t("leaseApproved.subject", { address: i.streetAddress }),
    preheader: t("leaseApproved.preheader", { name: i.landlord }),
    title: t("leaseApproved.title"),
    lead: t("leaseApproved.lead", { name: i.landlord }),
    rows: termRows(i.locale, i.lease, true),
    action: { cta: t("leaseApproved.cta"), url: i.url },
    why: t("leaseApproved.why"),
  });
}

export function termsChangedEmail(i: { locale: Locale; url: string; landlord: string; streetAddress: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    tag: { tone: "warning", label: t("termsChanged.tag") },
    subject: t("termsChanged.subject", { address: i.streetAddress }),
    preheader: t("termsChanged.preheader"),
    title: t("termsChanged.title"),
    lead: t("termsChanged.lead", { name: i.landlord }),
    action: { cta: t("termsChanged.cta"), url: i.url },
    why: t("termsChanged.why"),
  });
}

// ---------- Notifications to the landlord about the tenant's decision ------------------------

/** The tenant accepted the terms the landlord changed: the lease is set up. */
export function termsAcceptedEmail(i: { locale: Locale; url: string; tenant: string; lease: LeaseTerms; streetAddress: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    tag: { tone: "ok", label: t("termsAccepted.tag") },
    subject: t("termsAccepted.subject", { name: i.tenant, address: i.streetAddress }),
    preheader: t("termsAccepted.preheader"),
    title: t("termsAccepted.title"),
    lead: t("termsAccepted.lead", { name: i.tenant }),
    rows: termRows(i.locale, i.lease, true),
    action: { cta: t("termsAccepted.cta"), url: i.url },
    why: t("termsAccepted.why"),
  });
}

/**
 * The tenant withdrew the invitation (before the landlord took over) or turned down the changed terms.
 * Nothing left to do, so no button.
 */
export function requestCancelledEmail(i: { locale: Locale; tenant: string; streetAddress: string; takenOver: boolean }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    tag: { tone: "neutral", label: t("requestCancelled.tag") },
    subject: t(i.takenOver ? "requestCancelled.subjectDeclined" : "requestCancelled.subjectWithdrawn", { name: i.tenant, address: i.streetAddress }),
    preheader: t("requestCancelled.preheader"),
    title: t("requestCancelled.title"),
    lead: t(i.takenOver ? "requestCancelled.leadDeclined" : "requestCancelled.leadWithdrawn", { name: i.tenant }),
    rows: [[t("common.rows.property"), i.streetAddress]],
    why: t("requestCancelled.why", { name: i.tenant }),
  });
}

// ---------- Company access requests -------------------------------------------------------------

/** To the owner and admins: someone found the company by tax number and asks to join. */
export function accessRequestEmail(i: { locale: Locale; url: string; account: string; name: string; email: string; message: string | null }): Email {
  const t = translator(i.locale);
  const rows: [string, string][] = [
    [t("accessRequest.rows.name"), i.name],
    [t("accessRequest.rows.email"), i.email],
  ];
  if (i.message) rows.push([t("accessRequest.rows.message"), i.message]);
  return render({
    locale: i.locale,
    tag: { tone: "info", label: t("accessRequest.tag") },
    subject: t("accessRequest.subject", { name: i.name, account: i.account }),
    preheader: t("accessRequest.preheader"),
    title: t("accessRequest.title"),
    lead: t("accessRequest.lead", { name: i.name, account: i.account }),
    rows,
    note: t("accessRequest.note"),
    action: { cta: t("accessRequest.cta"), url: i.url },
    why: t("accessRequest.why", { account: i.account }),
  });
}

export function accessApprovedEmail(i: { locale: Locale; url: string; account: string; role: Enums<"account_role"> }): Email {
  const t = translator(i.locale);
  const roles = createTranslator({ locale: i.locale, messages: i.locale === "en" ? en : hu, namespace: "invite.roles" });
  return render({
    locale: i.locale,
    tag: { tone: "ok", label: t("accessApproved.tag") },
    subject: t("accessApproved.subject", { account: i.account }),
    preheader: t("accessApproved.preheader"),
    title: t("accessApproved.title"),
    lead: t("accessApproved.lead", { account: i.account }),
    rows: [
      [t("accessApproved.rows.role"), roles(i.role)],
      [t("accessApproved.rows.access"), t("common.accessAll")],
    ],
    action: { cta: t("accessApproved.cta"), url: i.url },
    why: t("accessApproved.why", { account: i.account }),
  });
}

export function accessDeclinedEmail(i: { locale: Locale; account: string }): Email {
  const t = translator(i.locale);
  return render({
    locale: i.locale,
    tag: { tone: "neutral", label: t("accessDeclined.tag") },
    subject: t("accessDeclined.subject", { account: i.account }),
    preheader: t("accessDeclined.preheader"),
    title: t("accessDeclined.title"),
    lead: t("accessDeclined.lead", { account: i.account }),
    why: t("accessDeclined.why", { account: i.account }),
  });
}

/** Account hand-over: the new account holder and the previous one each get one. */
export function holderChangedEmail(i: { locale: Locale; url: string; account: string; other: string; side: "new" | "previous" }): Email {
  const t = translator(i.locale);
  const k = i.side === "new" ? "holderNew" : "holderPrev";
  return render({
    locale: i.locale,
    tag: { tone: i.side === "new" ? "ok" : "neutral", label: t(`${k}.tag`) },
    subject: t(`${k}.subject`, { account: i.account }),
    preheader: t(`${k}.preheader`),
    title: t(`${k}.title`),
    lead: i.side === "new" ? t("holderNew.lead", { from: i.other, account: i.account }) : t("holderPrev.lead", { to: i.other, account: i.account }),
    action: { cta: t(`${k}.cta`), url: i.url },
    why: t(`${k}.why`, { account: i.account }),
  });
}

/** Security notices (always sent, whatever the email preferences): two-step on / off, a backup code was used. */
export function securityEmail(i: { locale: Locale; url: string; kind: "twoStepOn" | "twoStepOff" | "recoveryUsed" }): Email {
  const t = translator(i.locale);
  const k = `security.${i.kind}` as const;
  return render({
    locale: i.locale,
    tag: { tone: i.kind === "twoStepOn" ? "ok" : "warning", label: t("security.tag") },
    subject: t(`${k}.subject`),
    preheader: t(`${k}.preheader`),
    title: t(`${k}.title`),
    lead: t(`${k}.lead`),
    note: t("security.note"),
    action: { cta: t("security.cta"), url: i.url },
    why: t("security.why"),
  });
}
