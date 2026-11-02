import type { Enums } from "@/lib/supabase/database.types";

export type PropertyKind = Enums<"property_kind">;

/** The property type list (canvas "Meghívás 1 – ingatlan típusa"): residential, commercial, then "other". */
export const PROPERTY_KIND_GROUPS: { group: "residential" | "commercial" | null; kinds: PropertyKind[] }[] = [
  { group: "residential", kinds: ["flat", "house", "room"] },
  { group: "commercial", kinds: ["office", "retail", "hospitality", "industrial", "parking"] },
  { group: null, kinds: ["other"] },
];

export const PROPERTY_KINDS: PropertyKind[] = PROPERTY_KIND_GROUPS.flatMap((g) => g.kinds);

export const isPropertyKind = (value: unknown): value is PropertyKind => typeof value === "string" && (PROPERTY_KINDS as string[]).includes(value);
