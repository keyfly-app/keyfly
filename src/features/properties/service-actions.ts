"use server";

import { loadCatalog } from "@/features/catalog/load";
import { asksLabel } from "@/features/catalog/types";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type ServiceProblem = "provider" | "customLabel" | "meterName" | "fee" | "dates" | "date";
export type ServiceState =
  { status: "idle" } | { status: "saved" } | { status: "error"; error?: "generic" | "notAllowed"; fields?: Partial<Record<string, ServiceProblem>> };

export type ServiceInput = {
  propertyId: string;
  serviceId?: string;
  typeKey: string;
  customLabel: string;
  /** Who provides it: a catalogue provider, one of the contacts, a new contact by name, or just a typed name. */
  provider: { kind: "provider" | "contact" | "newContact" | "name"; id?: string; name: string } | null;
  networkProviderId: string;
  settlementKey: string;
  fee: string;
  readingRequired: boolean;
  readingFrequency: string;
  readingDue: string;
  identifiers: { label: string; value: string }[];
  meters: { id?: string; name: string; tariffKey: string; serial: string; registers: 1 | 2; location: string }[];
};

const clean = (v: string | undefined, max: number) => (v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

function failed(error: { code?: string; message?: string } | null): ServiceState {
  if (!error) return { status: "saved" };
  if (error.code === "42501" || error.message === "not_allowed" || error.message === "contact_not_in_account") return { status: "error", error: "notAllowed" };
  console.error("service save failed", error.code, error.message);
  return { status: "error", error: "generic" };
}

/** Adds or changes a service with its identifiers and meters (one database call, all or nothing). */
export async function saveService(input: ServiceInput): Promise<ServiceState> {
  const { service_type: types } = await loadCatalog("service_type");
  const type = types.find((t) => t.key === input.typeKey && (t.active || input.serviceId));
  if (!type) return { status: "error", error: "generic" };
  const utility = type.meta.group === "utility";
  const fields: Partial<Record<string, ServiceProblem>> = {};
  if (asksLabel(types, input.typeKey) && !clean(input.customLabel, 60)) fields.customLabel = "customLabel";
  if (!input.provider || !clean(input.provider.name, 120)) fields.provider = "provider";
  const feeRaw = input.fee.replace(/[\s.]/g, "");
  if (feeRaw && !/^\d{1,8}$/.test(feeRaw)) fields.fee = "fee";
  const meters = utility ? input.meters.slice(0, 20) : [];
  meters.forEach((m, i) => {
    if (!clean(m.name, 60)) fields[`meter.${i}`] = "meterName";
  });
  if (Object.keys(fields).length) return { status: "error", fields };

  const supabase = await createClient();
  let contactId: string | null = input.provider!.kind === "contact" ? (input.provider!.id ?? null) : null;
  if (input.provider!.kind === "newContact") {
    const { data: auth } = await supabase.auth.getClaims();
    const { data: property } = await supabase.from("properties").select("account_id").eq("id", input.propertyId).maybeSingle();
    if (!property || !auth?.claims) return { status: "error", error: "notAllowed" };
    const { data, error } = await supabase
      .from("contacts")
      .insert({ account_id: property.account_id, name: clean(input.provider!.name, 120), created_by: auth.claims.sub })
      .select("id")
      .single();
    if (error || !data) return failed(error ?? { message: "no_row" });
    contactId = data.id;
  }
  const settlement = input.settlementKey || "tenant_direct";
  const service: { [key: string]: Json } = {
    type_key: input.typeKey,
    custom_label: asksLabel(types, input.typeKey) ? clean(input.customLabel, 60) : null,
    provider_id: input.provider!.kind === "provider" ? (input.provider!.id ?? null) : null,
    provider_name: input.provider!.kind === "name" ? clean(input.provider!.name, 120) : null,
    contact_id: contactId,
    network_provider_id: utility && input.networkProviderId ? input.networkProviderId : null,
    settlement_key: settlement,
    fee_amount: feeRaw && (!utility || settlement === "flat_rate") ? Number(feeRaw) : null,
    fee_currency: "HUF",
    reading_required: utility && input.readingRequired,
    reading_frequency: utility && input.readingRequired ? input.readingFrequency || "monthly" : null,
    reading_due: utility && input.readingRequired ? input.readingDue || "d5" : null,
  };
  const unit = typeof type.meta.unit === "string" ? type.meta.unit : "kwh";
  const { error } = await supabase.rpc("save_service", {
    p_property_id: input.propertyId,
    // A new service has no id yet (the function then adds one).
    p_service_id: (input.serviceId ?? null) as string,
    p_service: service,
    p_identifiers: input.identifiers.slice(0, 20).map((i) => ({ label: clean(i.label, 60), value: clean(i.value, 120) })),
    p_meters: meters.map((m) => ({
      ...(m.id ? { id: m.id } : {}),
      name: clean(m.name, 60),
      tariff_key: type.meta.tariffs === true ? m.tariffKey || "standard" : "",
      unit_key: unit,
      serial: clean(m.serial, 40),
      registers: type.meta.tariffs === true ? m.registers : 1,
      location: clean(m.location, 80),
    })),
  });
  return failed(error);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Pause from a day, until a day or until resumed. */
export async function pauseService(propertyId: string, serviceId: string, from: string, until: string): Promise<ServiceState> {
  if (!DATE_RE.test(from)) return { status: "error", fields: { from: "date" } };
  if (until && !DATE_RE.test(until)) return { status: "error", fields: { until: "date" } };
  if (until && until < from) return { status: "error", fields: { until: "dates" } };
  return updateService(propertyId, serviceId, { paused_from: from, paused_until: until || null });
}

export async function resumeService(propertyId: string, serviceId: string): Promise<ServiceState> {
  return updateService(propertyId, serviceId, { paused_from: null, paused_until: null });
}

/** Ends the service today (its meters and readings stay). */
export async function endService(propertyId: string, serviceId: string): Promise<ServiceState> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date());
  return updateService(propertyId, serviceId, { ended_on: today, paused_from: null, paused_until: null });
}

async function updateService(
  propertyId: string,
  serviceId: string,
  patch: { paused_from?: string | null; paused_until?: string | null; ended_on?: string | null },
) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("property_services").update(patch).eq("id", serviceId).eq("property_id", propertyId).select("id");
  return error ? failed(error) : data?.length ? ({ status: "saved" } as const) : ({ status: "error", error: "notAllowed" } as const);
}
