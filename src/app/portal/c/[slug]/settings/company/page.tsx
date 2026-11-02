import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Office } from "@/features/companies/actions";
import { accountInitials, canManage, companyBySlug } from "@/features/companies/accounts";
import { CompanyDetailsForm } from "@/features/companies/CompanyDetailsForm";
import { LogoEditor } from "@/features/companies/LogoEditor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("companies.details");
  return { title: t("title"), robots: { index: false } };
}

const office = (v: unknown): Office | null => {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return { postal_code: String(o.postal_code ?? ""), city: String(o.city ?? ""), street: String(o.street ?? "") };
};

/** Cégadatok: the logo, then the company row; owners and admins edit them, everyone else reads the details. */
export default async function CompanyDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account) notFound();
  const supabase = await createClient();
  const { data: row } = await supabase
      .from("accounts")
      .select("name, legal_name, tax_number, eu_vat_number, company_reg_number, office_address, mailing_address, contact_email, contact_phone, nav_verified_at")
      .eq("id", account.id)
      .single();
  if (!row) notFound();
  const { office_address, mailing_address, ...rest } = row;
  return (
    <>
      {canManage(account) && <LogoEditor accountId={account.id} logoUrl={account.logoUrl} initials={accountInitials(account.name)} />}
      <CompanyDetailsForm
        key={JSON.stringify(row)}
        accountId={account.id}
        manage={canManage(account)}
        company={{ ...rest, office: office(office_address), mailing: office(mailing_address) }}
      />
    </>
  );
}
