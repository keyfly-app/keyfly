import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { AccountSummary } from "@/features/companies/accounts";
import { addressFromRow } from "@/lib/address";
import { siteHref } from "@/lib/site-href";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "./format";
import { ImportFlow } from "./ImportFlow";
import { IMPORT_FIELDS, addressKey, type ImportField, type Lookup } from "./import-rows";
import { canEditProperties, propertyList } from "./load";

const NAMED_FLOORS = ["ground", "raised_ground", "mezzanine", "basement", "attic"] as const;

/** Server side of the import: column names and types in both languages, the account's properties for duplicates. */
export async function ImportPage({ account, base }: { account: AccountSummary | null | undefined; base: string }) {
  if (!account || !canEditProperties(account.role)) notFound();
  const supabase = await createClient();
  const [hu, en, huFloors, enFloors, { data: kinds }, list, listHref, locale] = await Promise.all([
    getTranslations({ locale: "hu", namespace: "properties.import.columns" }),
    getTranslations({ locale: "en", namespace: "properties.import.columns" }),
    getTranslations({ locale: "hu", namespace: "leaseRequest.address.floors" }),
    getTranslations({ locale: "en", namespace: "leaseRequest.address.floors" }),
    supabase.from("catalog_items").select("key, label_hu, label_en, short_hu, short_en, active, sort").eq("list", "property_type").order("sort"),
    propertyList(account.id),
    siteHref("portal", `${base}/properties`),
    getLocale(),
  ]);
  const names = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, [hu(f), en(f)]])) as Record<ImportField, string[]>;
  const active = (kinds ?? []).filter((k) => k.active);
  const lookup: Lookup = {
    kinds: active.map((k) => ({ key: k.key, names: [k.label_hu, k.label_en, k.short_hu, k.short_en].filter((x): x is string => Boolean(x)) })),
    floors: NAMED_FLOORS.map((f) => ({ key: f, names: [huFloors(f), enFloors(f)] })),
    existing: list.map((p) => ({
      id: p.id,
      name: displayName(p.label, addressFromRow(p)),
      ownRef: p.own_ref,
      addressKey: addressKey({
        postalCode: p.postal_code,
        streetName: p.street_name,
        streetType: p.street_type,
        houseNumber: p.house_number,
        building: p.building,
        staircase: p.staircase,
        floor: `${p.floor_type ?? ""}${p.floor_number ?? ""}`,
        door: p.door,
      }),
    })),
  };
  const en_ = locale === "en";
  return (
    <ImportFlow
      accountId={account.id}
      listHref={listHref}
      names={names}
      lookup={lookup}
      kindOptions={active.map((k) => ({ key: k.key, label: en_ ? k.label_en : k.label_hu }))}
    />
  );
}
