import type { Json } from "@/lib/supabase/database.types";

/**
 * The option lists kept in `catalog_items` (shaped in admin later). Code depends only on these list names and on
 * stable item keys – never on labels, order or the set of items.
 */
export type CatalogList =
  | "property_type"
  | "outdoor_kind"
  | "heating"
  | "parking"
  | "furnishing"
  | "energy_rating"
  | "property_extra"
  | "service_type"
  | "meter_unit"
  | "meter_tariff"
  | "reading_frequency"
  | "reading_due"
  | "settlement"
  | "identifier"
  | "contact_role"
  | "pets"
  | "smoking";

/** One item in the viewer's language – plain data, safe to pass to client components. */
export type CatalogOption = {
  key: string;
  label: string;
  /** Shorter wording for tight places (chips, summaries); falls back to the label. */
  short: string;
  icon: string | null;
  active: boolean;
  meta: { [key: string]: Json | undefined };
};

/** Active items of a list in admin order: what a form offers. */
export const offered = (options: readonly CatalogOption[]) => options.filter((o) => o.active);

/** The label of a stored key; a retired item keeps its label, an unknown key shows as itself. */
export function labelOf(options: readonly CatalogOption[], key: string | null | undefined, short = false): string {
  if (!key) return "";
  const item = options.find((o) => o.key === key);
  return item ? (short ? item.short : item.label) : key;
}

/** Whether a list item asks for a typed name too (e.g. "Egyéb" → "Mi ez?"). */
export const asksLabel = (options: readonly CatalogOption[], key: string) =>
  options.find((o) => o.key === key)?.meta.asks_label === true;
