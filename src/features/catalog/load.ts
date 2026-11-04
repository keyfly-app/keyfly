import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import type { CatalogList, CatalogOption } from "./types";

/** Every catalogue row once per request (≈100 small rows); RLS lets anyone read them. */
const allRows = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .select("list, key, label_hu, label_en, short_hu, short_en, icon, sort, active, meta")
    .order("list")
    .order("sort")
    .order("key");
  if (error) throw new Error(`catalog unavailable (${error.code})`);
  return data;
});

/**
 * The given lists in the viewer's language, active and retired items alike (retired ones still label old data;
 * forms offer `offered(...)` only).
 */
export async function loadCatalog<L extends CatalogList>(...lists: L[]): Promise<Record<L, CatalogOption[]>> {
  const [rows, raw] = await Promise.all([allRows(), getLocale()]);
  const en = isLocale(raw) && raw === "en";
  const out = Object.fromEntries(lists.map((l) => [l, [] as CatalogOption[]])) as Record<L, CatalogOption[]>;
  for (const r of rows) {
    if (!(r.list in out)) continue;
    const label = en ? r.label_en : r.label_hu;
    const meta = r.meta && typeof r.meta === "object" && !Array.isArray(r.meta) ? r.meta : {};
    out[r.list as L].push({ key: r.key, label, short: (en ? r.short_en : r.short_hu) ?? label, icon: r.icon, active: r.active, meta });
  }
  return out;
}
