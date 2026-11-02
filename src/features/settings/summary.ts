import "server-only";
import { cache } from "react";
import { canManage, myAccounts, type AccountSummary } from "@/features/companies/accounts";
import { bankOf, domesticFromIban, groupIban } from "@/lib/bank-account";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import type { PersonalAddress } from "./actions";
import { currentUser } from "./current-user";

type Office = { postal_code?: string; city?: string; street?: string };
type BankRow = { account_id: string; iban: string; is_primary: boolean; currency: string };

export type CompanySummary = AccountSummary & {
  slug: string;
  manage: boolean;
  tax: string | null;
  navVerified: boolean;
  office: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  bank: string | null;
  members: number;
};

/** One step of "Fiókod beállítása": only what matters for security and payouts (optional data never nags). */
export type SetupStep = { key: "phone" | "twoStep" | "nav" | "bank"; done: boolean; company?: string; slug?: string };

export type SettingsSummary = {
  me: { name: string | null; phone: string | null; phoneVerified: boolean; home: string | null; mailing: string | null; mailingSame: boolean; bank: string | null; twoStep: boolean };
  companies: CompanySummary[];
  steps: SetupStep[];
};

const line = (a: unknown): string | null => {
  if (!a || typeof a !== "object" || Array.isArray(a)) return null;
  const o = a as Partial<PersonalAddress> & Office;
  const city = [o.postal_code, o.city].filter(Boolean).join(" ");
  const text = [city, [o.street, o.unit].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return text || null;
};

/** "OTP Bank · 11773016-11111018" for the primary (else first) account; foreign IBANs are grouped. */
function bankLine(rows: BankRow[]): string | null {
  const pick = rows.find((r) => r.is_primary && r.currency === "HUF") ?? rows.find((r) => r.is_primary) ?? rows[0];
  if (!pick) return null;
  const number = domesticFromIban(pick.iban) ?? groupIban(pick.iban);
  const bank = bankOf(pick.iban)?.name;
  return bank ? `${bank} · ${number}` : number;
}

/**
 * Settings → Összefoglaló (canvas v2.4 "Beállítások – áttekintés"): personal and company details in one place, and the
 * few setup steps. Once per request; the user menu reads the step count from here too.
 */
export const settingsSummary = cache(async (): Promise<SettingsSummary | null> => {
  const [user, accounts, supabase] = await Promise.all([currentUser(), myAccounts(), createClient()]);
  if (!user) return null;
  const companies = accounts.filter((a): a is AccountSummary & { slug: string } => a.kind === "company" && Boolean(a.slug));
  const ids = accounts.map((a) => a.id);
  const companyIds = companies.map((c) => c.id);
  const [{ data: profile }, { data: banks }, { data: details }, { data: members }, { data: factors }] = await Promise.all([
    supabase.from("profiles").select("home_address, mailing_address").eq("id", user.id).maybeSingle(),
    ids.length ? supabase.from("bank_accounts").select("account_id, iban, is_primary, currency").in("account_id", ids) : Promise.resolve({ data: [] as BankRow[] }),
    companyIds.length
      ? supabase.from("accounts").select("id, tax_number, nav_verified_at, office_address, contact_email, contact_phone").in("id", companyIds)
      : Promise.resolve({ data: [] }),
    companyIds.length ? supabase.from("account_members").select("account_id").in("account_id", companyIds) : Promise.resolve({ data: [] as { account_id: string }[] }),
    supabase.auth.mfa.listFactors(),
  ]);
  const personal = accounts.find((a) => a.kind === "person");
  const bankFor = (id: string | undefined) => bankLine((banks ?? []).filter((b) => b.account_id === id));
  const twoStep = (factors?.totp ?? []).some((f) => f.status === "verified");
  const home = line(profile?.home_address);
  const mailing = line(profile?.mailing_address);

  const rows: CompanySummary[] = companies.map((c) => {
    const d = (details ?? []).find((x) => x.id === c.id);
    return {
      ...c,
      manage: canManage(c),
      tax: d?.tax_number ?? null,
      navVerified: Boolean(d?.nav_verified_at),
      office: line(d?.office_address),
      contactEmail: d?.contact_email ?? null,
      contactPhone: d?.contact_phone ? formatPhone(d.contact_phone) : null,
      bank: bankFor(c.id),
      members: (members ?? []).filter((m) => m.account_id === c.id).length,
    };
  });

  const steps: SetupStep[] = [
    { key: "phone", done: Boolean(user.phoneVerifiedAt) },
    { key: "twoStep", done: twoStep },
    ...rows
      .filter((c) => c.manage)
      .flatMap((c): SetupStep[] => [
        { key: "nav", done: c.navVerified, company: c.name, slug: c.slug },
        { key: "bank", done: Boolean(c.bank), company: c.name, slug: c.slug },
      ]),
  ];

  return {
    me: {
      name: user.fullName,
      phone: user.phone ? formatPhone(user.phone) : null,
      phoneVerified: Boolean(user.phoneVerifiedAt),
      home,
      mailing,
      mailingSame: Boolean(home) && !mailing,
      bank: bankFor(personal?.id),
      twoStep,
    },
    companies: rows,
    steps,
  };
});
