import { getTranslations } from "next-intl/server";
import { addressFromRow, streetLine } from "@/lib/address";
import { money } from "@/lib/format";
import { DataCards, type DataCardsProps, type Section } from "./DataCards";
import { featureFacts } from "./facts";
import { addressLine } from "./format";
import { fieldsOf, kindLabel } from "./kinds";
import { accountContacts, accountExtras, responsibleOptions } from "./load";
import type { PropertyContext } from "./PropertyFrame";

const SECTIONS: Section[] = ["identity", "address", "features", "management", "condo", "note"];
export const readSection = (raw: string | undefined): Section | null => SECTIONS.find((s) => s === raw) ?? null;

/** "Adatok": the server side of the data cards – what each card shows and the values its form starts from. */
export async function DataTab({ ctx, open }: { ctx: PropertyContext; open: Section | null }) {
  const { property: p, catalog, locale, account, editable } = ctx;
  const company = account.kind === "company";
  const [t, o, facts, extras, team] = await Promise.all([
    getTranslations("properties.data"),
    getTranslations("properties.overview"),
    featureFacts(ctx),
    editable ? accountExtras(account.id) : Promise.resolve([]),
    company ? responsibleOptions(account.id) : Promise.resolve([]),
  ]);
  const a = addressFromRow(p);
  const m = p.property_management;
  const contacts = editable ? await accountContacts(account.id) : [];
  const ownerContact =
    p.property_contacts.find((l) => l.contacts?.id === m?.owner_contact_id)?.contacts?.name ?? contacts.find((c) => c.id === m?.owner_contact_id)?.name;
  const ownerText =
    m?.owner_kind === "other" ? `${ownerContact ?? t("owner.other")} · ${t("owner.otherShort")}` : m?.owner_kind ? t(`owner.${m.owner_kind}`) : null;
  const managers = p.property_contacts
    .filter((l) => l.role_key === "condo_manager" && l.contacts)
    .map((l) => l.contacts!.name)
    .join(", ");
  const decimal = (n: number | null) => (n == null ? "" : locale === "hu" ? String(Number(n)).replace(".", ",") : String(Number(n)));
  const floor = p.floor_type ? (p.floor_type === "numbered" ? `numbered:${p.floor_number}` : p.floor_type) : "";

  const props: DataCardsProps = {
    propertyId: p.id,
    editable,
    company,
    open,
    types: catalog.property_type,
    identity: {
      rows: [
        [t("identity.name"), p.label],
        [t("identity.code"), p.public_code],
        [t("identity.ownRef"), p.own_ref],
        [t("identity.type"), kindLabel(catalog.property_type, p.kind, p.other_kind_label)],
      ],
      label: p.label ?? "",
      ownRef: p.own_ref ?? "",
      kind: p.kind,
      otherLabel: p.other_kind_label ?? "",
      namePlaceholder: streetLine(a),
    },
    address: {
      rows: [
        [t("address.address"), addressLine(a)],
        [t("address.parcel"), p.parcel_number],
      ],
      values: {
        postalCode: p.postal_code,
        city: p.city,
        streetName: p.street_name,
        streetType: p.street_type,
        houseNumber: p.house_number,
        building: p.building ?? "",
        staircase: p.staircase ?? "",
        floor,
        door: p.door ?? "",
      },
      parcel: p.parcel_number ?? "",
    },
    features: {
      rows: facts.filter((f) => f.key !== "floor").map((f) => [f.label, f.value]),
      fields: [...fieldsOf(catalog.property_type, p.kind)],
      values: {
        area: decimal(p.area_m2),
        rooms: p.rooms == null ? "" : String(p.rooms),
        halfRooms: p.half_rooms == null ? "" : String(p.half_rooms),
        builtYear: p.built_year == null ? "" : String(p.built_year),
        heating: p.heating ?? "",
        energy: p.energy_rating ?? "",
        parking: p.parking ?? "",
        lift: p.lift == null ? "" : p.lift ? "yes" : "no",
        furnishing: p.furnishing ?? "",
        outdoor: p.property_outdoor.map((x) => ({
          kind: x.kind,
          area: decimal(x.area_m2),
        })),
        extras: p.property_extras.flatMap((e) => (e.extra_key ? [e.extra_key] : [])),
        ownExtras: p.property_extras.flatMap((e) => (e.account_extra_id ? [e.account_extra_id] : [])),
      },
      options: {
        heating: catalog.heating,
        energy: catalog.energy_rating,
        parking: catalog.parking,
        furnishing: catalog.furnishing,
        outdoor: catalog.outdoor_kind,
        extras: catalog.property_extra,
      },
      accountExtras: extras,
    },
    management: {
      rows: [
        [t("owner.title"), ownerText],
        ...(company ? ([[t("management.responsible"), team.find((x) => x.id === m?.responsible_user_id)?.name ?? null]] as [string, string | null][]) : []),
      ],
      owner: {
        propertyId: p.id,
        company,
        kind: (m?.owner_kind ?? "") as "" | "self" | "account" | "other",
        contactId: m?.owner_contact_id ?? "",
        contacts: contacts.map((c) => ({ id: c.id, name: c.name })),
        responsible: m?.responsible_user_id ?? "",
        team,
      },
    },
    condo: {
      rows: [
        [t("condo.manager"), managers || null],
        [t("condo.commonCharge"), m?.common_charge != null ? o("lease.perMonth", { rent: money(m.common_charge, locale) }) : null],
      ],
      commonCharge: m?.common_charge != null ? String(m.common_charge) : "",
    },
    note: { text: m?.note ?? "" },
  };
  return <DataCards {...props} />;
}
