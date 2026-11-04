import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";

type Client = Awaited<ReturnType<typeof createClient>>;
type OneRowTable = "property_management" | "property_listing";
type DbError = { code?: string; message?: string } | null;

/**
 * Saves the property's single row in a one-row-per-property table (management, listing). The column grants never let
 * property_id change, which a PostgREST upsert would write, so the row is updated and only inserted when there is none
 * yet (a parallel first save that wins the insert is followed by an update).
 */
export async function savePropertyRow<T extends OneRowTable>(supabase: Client, table: T, propertyId: string, patch: TablesUpdate<T>): Promise<DbError> {
  // A generic table name defeats supabase-js's row typing; the signature above keeps every caller typed.
  const rows = () => supabase.from(table as "property_listing");
  const values = patch as TablesUpdate<"property_listing">;
  const update = () => rows().update(values).eq("property_id", propertyId).select("property_id");
  const { data, error } = await update();
  if (error || data?.length) return error;
  const { error: insert } = await rows().insert({ ...values, property_id: propertyId });
  if (insert?.code !== "23505") return insert;
  const retry = await update();
  return retry.error ?? (retry.data?.length ? null : { code: "42501" });
}
