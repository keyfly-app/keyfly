import { isIconName, type IconName } from "@/components/Icon";
import { labelOf, type CatalogOption } from "@/features/catalog/types";

/** Feature fields a property type may ask for (catalogue `property_type.meta.fields`); area and year built always. */
export type FeatureField = "rooms" | "outdoor" | "heating" | "energy_rating" | "lift" | "furnishing" | "parking" | "extras";

export function fieldsOf(types: readonly CatalogOption[], kind: string): Set<FeatureField> {
  const raw = types.find((t) => t.key === kind)?.meta.fields;
  return new Set(Array.isArray(raw) ? (raw.filter((f) => typeof f === "string") as FeatureField[]) : []);
}

export function kindIcon(types: readonly CatalogOption[], kind: string): IconName {
  const icon = types.find((t) => t.key === kind)?.icon;
  return isIconName(icon) ? icon : "home";
}

/** "Lakás", or the owner's own word for an "other" property ("Műterem"). */
export const kindLabel = (types: readonly CatalogOption[], kind: string, otherLabel: string | null) => otherLabel || labelOf(types, kind);
