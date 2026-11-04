import "server-only";
import { cache } from "react";
import { todayIso } from "@/features/lease-requests/validate";
import { ADDRESS_COLUMNS, type AddressRow } from "@/lib/address";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/** Who may change an account's properties (RLS narrows managers to their selected properties). */
export const canEditProperties = (role: Enums<"account_role">) => role === "owner" || role === "admin" || role === "manager";

/** A lease ending within this many days marks its property "free from …". */
const ENDING_SOON_DAYS = 60;

type LeaseRow = {
  id: string;
  status: Enums<"lease_status">;
  start_date: string;
  end_date: string | null;
  termination_date: string | null;
  monthly_rent: number;
  lease_parties: { side: Enums<"lease_party_side">; name: string | null }[];
};

export type Occupancy =
  | {
      state: "let";
      tenant: string | null;
      rent: number;
      leaseId: string;
      start: string;
      end: string | null;
    }
  | {
      state: "ending";
      tenant: string | null;
      rent: number;
      leaseId: string;
      start: string;
      end: string;
    }
  | {
      state: "progress";
      tenant: string | null;
      rent: number;
      leaseId: string;
      start: string;
      end: string | null;
    }
  | { state: "vacant" };

const lastDay = (l: LeaseRow) => [l.end_date, l.termination_date].filter((d): d is string => Boolean(d)).sort()[0] ?? null;
const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Let, ending soon, a lease in progress, or vacant – from the property's leases (Budapest dates). A confirmed lease that
 * runs today or starts later counts as let; one that ends within 60 days with nothing after it, as ending.
 */
export function occupancyOf(leases: LeaseRow[], today = todayIso()): Occupancy {
  const tenantOf = (l: LeaseRow) => l.lease_parties.find((p) => p.side === "tenant")?.name ?? null;
  const live = leases.filter((l) => l.status === "confirmed" && (lastDay(l) ?? "9999-12-31") >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const current = live.find((l) => l.start_date <= today) ?? live[0];
  if (current) {
    const end = lastDay(current);
    const base = {
      tenant: tenantOf(current),
      rent: current.monthly_rent,
      leaseId: current.id,
      start: current.start_date,
    };
    const followed = live.some((l) => l !== current && l.start_date > current.start_date);
    if (end && !followed && end <= addDays(today, ENDING_SOON_DAYS)) return { state: "ending", ...base, end };
    return { state: "let", ...base, end };
  }
  const pending = leases.find((l) => l.status === "pending" || l.status === "draft");
  if (pending)
    return {
      state: "progress",
      tenant: tenantOf(pending),
      rent: pending.monthly_rent,
      leaseId: pending.id,
      start: pending.start_date,
      end: lastDay(pending),
    };
  return { state: "vacant" };
}

const LEASE_COLUMNS = "id, status, start_date, end_date, termination_date, monthly_rent, lease_parties(side, name)";
const LIST_COLUMNS = `id, public_code, label, kind, other_kind_label, own_ref, area_m2, rooms, half_rooms, ${ADDRESS_COLUMNS}, leases(${LEASE_COLUMNS})`;

export type PropertyListRow = AddressRow & {
  id: string;
  public_code: string;
  label: string | null;
  kind: string;
  other_kind_label: string | null;
  own_ref: string | null;
  area_m2: number | null;
  rooms: number | null;
  half_rooms: number | null;
  occupancy: Occupancy;
};

/** The account's live properties, newest first, each with its occupancy. Once per request. */
export const propertyList = cache(async (accountId: string): Promise<PropertyListRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(LIST_COLUMNS)
    .eq("account_id", accountId)
    .is("archived_at", null)
    .neq("leases.status", "cancelled")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`properties unavailable (${error.code})`);
  const today = todayIso();
  return data.map(({ leases, ...p }) => ({
    ...p,
    occupancy: occupancyOf(leases, today),
  }));
});

const DETAIL_COLUMNS = `id, account_id, public_code, label, kind, other_kind_label, own_ref, parcel_number,
  area_m2, rooms, half_rooms, built_year, heating, energy_rating, parking, lift, furnishing, created_at, ${ADDRESS_COLUMNS},
  property_outdoor(kind, area_m2),
  property_extras(extra_key, account_extra_id, account_extras(label)),
  property_management(owner_kind, owner_contact_id, responsible_user_id, common_charge, note),
  property_contacts(id, role_key, role_label, tenant_visible, sort, contacts(id, name, email, phone, address, note)),
  property_services(id, type_key, custom_label, provider_id, provider_name, network_provider_id, contact_id, settlement_key, fee_amount,
    fee_currency, reading_required, reading_frequency, reading_due, paused_from, paused_until, ended_on, sort,
    service_identifiers(id, label, value, sort), meters(id, name, tariff_key, unit_key, serial, registers, location, sort, archived_at)),
  leases(${LEASE_COLUMNS})`;

/** One live property of the account by its Keyfly ID ("KF-48Q7M"); null when it is not there or not visible. */
export const propertyByCode = cache(async (accountId: string, code: string) => {
  if (!/^KF-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/.test(code)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(DETAIL_COLUMNS)
    .eq("account_id", accountId)
    .eq("public_code", code)
    .is("archived_at", null)
    .neq("leases.status", "cancelled")
    .maybeSingle();
  if (!data) return null;
  const { leases, ...p } = data;
  return { ...p, leases, occupancy: occupancyOf(leases) };
});

export type PropertyDetail = NonNullable<Awaited<ReturnType<typeof propertyByCode>>>;

/** The account's own extras (offered on every property's features form). */
export async function accountExtras(accountId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("account_extras").select("id, label").eq("account_id", accountId).order("label");
  return data ?? [];
}

/** Colleagues who can be responsible for a property: everyone but viewers. */
export async function responsibleOptions(accountId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("account_members_list", {
    p_account_id: accountId,
  });
  return (data ?? []).filter((m) => m.role !== "viewer").map((m) => ({ id: m.user_id, name: m.full_name || m.email }));
}

/** The account's contacts (newest first) with how many properties each is linked to – the "from your list" picker. */
export async function accountContacts(accountId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name, email, phone, address, note, default_role_key, default_role_label, property_contacts(property_id)")
    .eq("account_id", accountId)
    .is("archived_at", null)
    .order("name");
  return (data ?? []).map(({ property_contacts, ...c }) => ({ ...c, properties: new Set(property_contacts.map((x) => x.property_id)).size }));
}
export type AccountContact = Awaited<ReturnType<typeof accountContacts>>[number];
