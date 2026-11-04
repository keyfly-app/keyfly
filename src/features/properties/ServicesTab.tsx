import { getTranslations } from "next-intl/server";
import { isIconName } from "@/components/Icon";
import { loadCatalog } from "@/features/catalog/load";
import { labelOf, type CatalogOption } from "@/features/catalog/types";
import { todayIso } from "@/features/lease-requests/validate";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { shortDate } from "./format";
import { accountContacts } from "./load";
import type { PropertyContext } from "./PropertyFrame";
import type { ContactOption, ProviderOption, ServiceCatalog } from "./ServiceForm";
import { ServicesPanel, type ServiceView } from "./ServicesPanel";

/** The curated providers (active ones; RLS). */
export async function providerOptions(): Promise<ProviderOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("providers")
    .select("id, service_types, role, legal_name, short_name, former_names, website, postcode_prefixes")
    .order("sort")
    .order("short_name");
  return (data ?? []).map((p) => ({
    id: p.id,
    shortName: p.short_name,
    legalName: p.legal_name,
    formerNames: p.former_names,
    role: p.role === "network" ? "network" : "supplier",
    serviceTypes: p.service_types,
    prefixes: p.postcode_prefixes,
    website: p.website,
  }));
}

const lowerFirst = (s: string) => (s ? s[0]!.toLocaleLowerCase() + s.slice(1) : s);

/** One service as its card shows it (and the values its edit form starts from). */
export async function serviceViews(ctx: PropertyContext, providers: ProviderOption[]) {
  const { property: p, locale } = ctx;
  const [t, c] = await Promise.all([
    getTranslations("properties.services"),
    loadCatalog("service_type", "settlement", "reading_frequency", "reading_due", "meter_tariff", "meter_unit", "identifier", "contact_role"),
  ]);
  const today = todayIso();
  const dayBefore = (iso: string) => (locale === "hu" ? shortDate(iso, locale).replace(/\.$/, "") : shortDate(iso, locale));
  const contactName = new Map(p.property_contacts.filter((l) => l.contacts).map((l) => [l.contacts!.id, l.contacts!.name]));
  const extraContacts = p.property_services.some((s) => s.contact_id && !contactName.has(s.contact_id)) ? await accountContacts(ctx.account.id) : [];
  for (const x of extraContacts) contactName.set(x.id, x.name);
  const providerName = new Map(providers.map((x) => [x.id, x]));
  return {
    catalog: c,
    views: [...p.property_services]
      .filter((s) => !s.ended_on)
      .sort((a, b) => a.sort - b.sort)
      .map((s): ServiceView => {
        const type = c.service_type.find((x) => x.key === s.type_key);
        const group = type?.meta.group === "utility" ? "utility" : "other";
        const name = s.custom_label || labelOf(c.service_type, s.type_key);
        const provider = s.provider_id ? providerName.get(s.provider_id)?.shortName : s.contact_id ? contactName.get(s.contact_id) : s.provider_name;
        const fee = s.fee_amount != null ? t("perMonth", { amount: money(s.fee_amount, locale) }) : null;
        const pausedNow = s.paused_from && (!s.paused_until || s.paused_until >= today);
        const paused = pausedNow
          ? s.paused_from! > today
            ? t("pausedFrom", { date: dayBefore(s.paused_from!) })
            : s.paused_until
              ? t("pausedUntil", { date: dayBefore(s.paused_until) })
              : t("paused")
          : null;
        const meters = s.meters.filter((m) => !m.archived_at).sort((a, b) => a.sort - b.sort);
        return {
          id: s.id,
          group,
          icon: isIconName(type?.icon) ? type.icon : "grid",
          name,
          subtitle: [provider, fee].filter(Boolean).join(" · "),
          settlement: labelOf(c.settlement, s.settlement_key, true),
          tenantPays: s.settlement_key === "tenant_direct",
          network: s.network_provider_id ? (providerName.get(s.network_provider_id)?.legalName ?? null) : null,
          reading:
            s.reading_required && s.reading_frequency && s.reading_due
              ? t("readingText", { frequency: labelOf(c.reading_frequency, s.reading_frequency), due: lowerFirst(labelOf(c.reading_due, s.reading_due)) })
              : null,
          paused,
          pausedFrom: s.paused_from,
          identifiers: [...s.service_identifiers].sort((a, b) => a.sort - b.sort).map((i) => ({ label: i.label, value: i.value })),
          meters: meters.map((m) => ({
            id: m.id,
            name: m.name,
            sub: [type?.meta.tariffs === true && m.tariff_key ? labelOf(c.meter_tariff, m.tariff_key) : null, m.location].filter(Boolean).join(" · "),
            serial: m.serial ?? "",
            unit: labelOf(c.meter_unit, m.unit_key),
          })),
          draft: {
            serviceId: s.id,
            typeKey: s.type_key,
            customLabel: s.custom_label ?? "",
            provider: s.provider_id
              ? { kind: "provider", id: s.provider_id, name: providerName.get(s.provider_id)?.shortName ?? "" }
              : s.contact_id
                ? { kind: "contact", id: s.contact_id, name: contactName.get(s.contact_id) ?? "" }
                : s.provider_name
                  ? { kind: "name", name: s.provider_name }
                  : null,
            networkProviderId: s.network_provider_id ?? "",
            settlementKey: s.settlement_key,
            fee: s.fee_amount != null ? String(s.fee_amount) : "",
            readingRequired: s.reading_required,
            readingFrequency: s.reading_frequency ?? "monthly",
            readingDue: s.reading_due ?? "d5",
            identifiers: [...s.service_identifiers].sort((a, b) => a.sort - b.sort).map((i) => ({ label: i.label, value: i.value })),
            meters: meters.map((m) => ({
              id: m.id,
              name: m.name,
              tariffKey: m.tariff_key ?? "standard",
              serial: m.serial ?? "",
              registers: m.registers === 2 ? 2 : 1,
              location: m.location ?? "",
            })),
          },
        };
      }),
  };
}

/** Server side of "Szolgáltatások". */
export async function ServicesTab({ ctx, openAdd }: { ctx: PropertyContext; openAdd: "utility" | "other" | null }) {
  const { property: p, account, editable } = ctx;
  const providers = await providerOptions();
  const [{ catalog: c, views }, contacts] = await Promise.all([serviceViews(ctx, providers), editable ? accountContacts(account.id) : Promise.resolve([])]);
  const catalog: ServiceCatalog = {
    types: c.service_type,
    settlements: c.settlement,
    frequencies: c.reading_frequency,
    dues: c.reading_due,
    tariffs: c.meter_tariff,
    identifiers: c.identifier,
  };
  const roleOf = (key: string | null, label: string | null, roles: CatalogOption[]) => (key ? labelOf(roles, key) : (label ?? ""));
  const contactOptions: ContactOption[] = contacts.map((x) => ({
    id: x.id,
    name: x.name,
    role: roleOf(x.default_role_key, x.default_role_label, c.contact_role),
  }));
  return (
    <ServicesPanel
      propertyId={p.id}
      editable={editable}
      services={views}
      catalog={catalog}
      providers={providers}
      contacts={contactOptions}
      postalCode={p.postal_code}
      openAdd={openAdd}
    />
  );
}
