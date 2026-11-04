import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import type { TagTone } from "@/components/ui/Tag";
import type { AccountView } from "@/features/companies/accounts";
import { inProgress, tenantCards } from "@/features/lease-requests/load";
import { STATUS_TONE } from "@/features/lease-requests/ui";
import { isLocale } from "@/i18n/config";
import { ADDRESS_COLUMNS, addressFromRow, cityLine, streetLine } from "@/lib/address";
import { date, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { loadCatalog } from "@/features/catalog/load";
import { labelOf } from "@/features/catalog/types";

export type LeasePhase = "progress" | "recorded" | "other";

/** One lease (or lease request) in a list, formatted for the viewer's language. */
export type LeaseItem = {
  id: string;
  street: string;
  /** "Lakás · 1138 Budapest, XIII. kerület" */
  place: string;
  /** The other side: the landlord for a tenant, the tenant for a landlord. */
  party: string;
  rent: string;
  period: string;
  tag: { tone: TagTone; label: string };
  phase: LeasePhase;
  /** The tenant's status page; landlords have no lease page yet. */
  href: string | null;
};

const LEASE_TONE = { pending: "warning", confirmed: "ok", closed: "neutral" } as const satisfies Record<string, TagTone>;

/**
 * The account's leases in a View. As tenant: the lease requests it sent (and the leases they became). As landlord:
 * the leases recorded with the account as landlord (RLS: members of the landlord account), drafts and cancelled
 * ones left out.
 */
export async function leaseItems(accountId: string, view: AccountView): Promise<LeaseItem[]> {
  const lr = await getTranslations("leaseRequest");
  if (view === "tenant") {
    return (await tenantCards(accountId)).map((c) => ({
      id: c.id,
      street: c.street,
      place: c.city,
      party: c.landlord,
      rent: c.rent,
      period: c.period,
      tag: { tone: STATUS_TONE[c.status], label: lr(`status.${c.status}`) },
      phase: c.status === "confirmed" ? "recorded" : inProgress(c) ? "progress" : "other",
      href: c.href,
    }));
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("leases")
    .select(`id, status, monthly_rent, start_date, end_date, properties(kind, ${ADDRESS_COLUMNS}), lease_parties(side, name)`)
    .eq("account_id", accountId)
    .in("status", ["pending", "confirmed", "closed"])
    .order("start_date", { ascending: false });
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const [t, { property_type: kinds }] = await Promise.all([getTranslations("leases"), loadCatalog("property_type")]);
  return (data ?? []).flatMap((l) => {
    if (l.status !== "pending" && l.status !== "confirmed" && l.status !== "closed") return [];
    const address = addressFromRow(l.properties);
    return [
      {
        id: l.id,
        street: streetLine(address),
        place: `${labelOf(kinds, l.properties.kind)} · ${cityLine(address)}`,
        party: l.lease_parties.find((p) => p.side === "tenant")?.name ?? "–",
        rent: money(l.monthly_rent, locale),
        period: `${date(l.start_date, locale)} – ${l.end_date ? date(l.end_date, locale) : lr("terms.openEnded")}`,
        tag: { tone: LEASE_TONE[l.status], label: l.status === "confirmed" ? lr("status.confirmed") : t(`status.${l.status}`) },
        phase: l.status === "confirmed" ? "recorded" : l.status === "pending" ? "progress" : "other",
        href: null,
      },
    ];
  });
}
