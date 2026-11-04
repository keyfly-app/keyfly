import "server-only";
import { getTranslations } from "next-intl/server";
import { labelOf } from "@/features/catalog/types";
import { areaNumber, roomsText } from "./format";
import { fieldsOf } from "./kinds";
import type { PropertyContext } from "./PropertyFrame";

export type Fact = { key: string; label: string; value: string | null };

/**
 * The property's features as label / value pairs, in the order the canvas shows them, limited to what its type asks
 * for (catalogue). `value` null = not filled in yet.
 */
export async function featureFacts(ctx: PropertyContext): Promise<Fact[]> {
  const { property: p, catalog, locale } = ctx;
  const [t, f, lr] = await Promise.all([getTranslations("properties"), getTranslations("properties.data.features"), getTranslations("leaseRequest.address")]);
  const fields = fieldsOf(catalog.property_type, p.kind);
  const m2 = (n: number) => t("area", { area: areaNumber(n, locale) });
  const facts: Fact[] = [
    {
      key: "area",
      label: f("area"),
      value: p.area_m2 != null ? m2(p.area_m2) : null,
    },
  ];
  if (fields.has("rooms"))
    facts.push({
      key: "rooms",
      label: f("rooms"),
      value: roomsText(t, p.rooms, p.half_rooms) || null,
    });
  if (fields.has("outdoor")) {
    const outdoor = p.property_outdoor.map((o) =>
      o.area_m2 != null ? `${labelOf(catalog.outdoor_kind, o.kind)}, ${m2(o.area_m2)}` : labelOf(catalog.outdoor_kind, o.kind),
    );
    facts.push({
      key: "outdoor",
      label: f("outdoor"),
      value: outdoor.join(" · ") || null,
    });
  }
  if (p.floor_type) {
    facts.push({
      key: "floor",
      label: f("floor"),
      value: p.floor_type === "numbered" ? lr("floorNumbered", { number: p.floor_number ?? 0 }) : lr(`floors.${p.floor_type}`),
    });
  }
  if (fields.has("heating"))
    facts.push({
      key: "heating",
      label: f("heating"),
      value: p.heating ? labelOf(catalog.heating, p.heating) : null,
    });
  if (fields.has("furnishing"))
    facts.push({
      key: "furnishing",
      label: f("furnishing"),
      value: p.furnishing ? labelOf(catalog.furnishing, p.furnishing) : null,
    });
  if (fields.has("lift"))
    facts.push({
      key: "lift",
      label: f("lift"),
      value: p.lift == null ? null : f(p.lift ? "liftYes" : "liftNo"),
    });
  if (fields.has("parking"))
    facts.push({
      key: "parking",
      label: f("parking"),
      value: p.parking ? labelOf(catalog.parking, p.parking) : null,
    });
  if (fields.has("extras")) {
    const extras = p.property_extras.map((e) => (e.extra_key ? labelOf(catalog.property_extra, e.extra_key) : (e.account_extras?.label ?? ""))).filter(Boolean);
    facts.push({
      key: "extras",
      label: f("extras"),
      value: extras.join(", ") || null,
    });
  }
  if (fields.has("energy_rating"))
    facts.push({
      key: "energy",
      label: f("energy"),
      value: p.energy_rating ? labelOf(catalog.energy_rating, p.energy_rating) : null,
    });
  facts.push({
    key: "builtYear",
    label: f("builtYear"),
    value: p.built_year != null ? String(p.built_year) : null,
  });
  return facts;
}
