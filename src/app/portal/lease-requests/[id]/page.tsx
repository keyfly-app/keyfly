import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LeaseRequestStatus } from "@/features/lease-requests/LeaseRequestStatus";
import { ADDRESS_COLUMNS } from "@/lib/address";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaseRequest");
  return { title: t("page.label"), robots: { index: false } };
}

/** Tenant side of one lease request: loads the request, the landlord's lease (if taken over) and the caller's role. */
export default async function LeaseRequest({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; reminded?: string }>;
}) {
  const [{ id }, { sent, reminded }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const { data: r } = await supabase.from("lease_requests").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [{ data: lease }, { data: claims }] = await Promise.all([
    r.lease_id
      ? supabase
          .from("leases")
          .select(`start_date, end_date, monthly_rent, deposit_amount, payment_day, created_at, landlord_confirmed_at, properties(${ADDRESS_COLUMNS})`)
          .eq("id", r.lease_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.auth.getClaims(),
  ]);
  // Only owners and admins of the renting account remind, withdraw or decide; other members see the state.
  const { data: membership } = await supabase
    .from("account_members")
    .select("role")
    .eq("account_id", r.tenant_account_id)
    .eq("user_id", String(claims?.claims.sub ?? ""))
    .maybeSingle();
  const canAct = membership?.role === "owner" || membership?.role === "admin";

  return <LeaseRequestStatus request={r} lease={lease} canAct={canAct} sent={Boolean(sent)} reminded={Boolean(reminded)} />;
}
