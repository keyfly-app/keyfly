import "server-only";
import { cache } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { ADDRESS_COLUMNS, addressFromRow, cityLine, streetLine } from "@/lib/address";
import { date, money } from "@/lib/format";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";
import type { HomeCard } from "./TenantHome";
import { loadCatalog } from "@/features/catalog/load";
import { labelOf } from "@/features/catalog/types";

/**
 * The lease requests an account sent as tenant, newest first, formatted for the viewer's language (Overview, the
 * "Szerződéseim" list and the menu's to-do count). Withdrawn requests stay out. Once per request and account.
 */
export const tenantCards = cache(async (accountId: string): Promise<HomeCard[]> => {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("lease_requests")
    .select(
      `id, status, invitation_expires_at, reminder_count, monthly_rent, start_date, end_date, created_at, decided_at, updated_at, property_kind, landlord_name, landlord_email, ${ADDRESS_COLUMNS}, leases(monthly_rent, start_date, end_date, properties(kind, ${ADDRESS_COLUMNS}), lease_parties(side, name))`,
    )
    .eq("tenant_account_id", accountId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const [lr, { property_type: kinds }] = await Promise.all([getTranslations("leaseRequest"), loadCatalog("property_type")]);
  const now = new Date();
  return Promise.all(
    (requests ?? []).map(async (r) => {
      // The row carries the latest link's expiry (a reminder replaces the link), readable by every member of the account.
      const expired = r.status === "pending_landlord" && new Date(r.invitation_expires_at) <= now;
      const lease = r.leases;
      const address = lease?.properties ? addressFromRow(lease.properties) : addressFromRow(r);
      const start = lease?.start_date ?? r.start_date;
      const end = lease ? lease.end_date : r.end_date;
      return {
        id: r.id,
        status: expired ? ("expired" as const) : r.status,
        street: streetLine(address),
        // "Lakás · 1138 Budapest, XIII. kerület": what is rented, then where.
        city: `${labelOf(kinds, lease?.properties?.kind ?? r.property_kind)} · ${cityLine(address)}`,
        // The landlord as recorded on the lease; before that, as the tenant named them.
        landlord: lease?.lease_parties.find((p) => p.side === "landlord")?.name ?? r.landlord_name ?? r.landlord_email,
        rent: money(lease?.monthly_rent ?? r.monthly_rent, locale),
        period: `${date(start, locale)} – ${end ? date(end, locale) : lr("terms.openEnded")}`,
        sent: date(r.created_at, locale),
        expires: date(r.invitation_expires_at, locale),
        closed: date(r.decided_at ?? r.updated_at, locale),
        canResend: r.reminder_count < 3,
        href: await siteHref("portal", `/lease-requests/${r.id}`),
      };
    }),
  );
});

/** Waits for the tenant: a decision on changed terms, or an expired invitation that can be sent again. */
export const isTodo = (c: HomeCard) => c.status === "pending_tenant" || (c.status === "expired" && c.canResend);

/** Still on its way to being recorded. */
export const inProgress = (c: HomeCard) => c.status === "pending_landlord" || c.status === "expired" || c.status === "pending_tenant";
