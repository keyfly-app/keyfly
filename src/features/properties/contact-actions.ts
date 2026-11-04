"use server";

import { loadCatalog } from "@/features/catalog/load";
import { createClient } from "@/lib/supabase/server";

export type ContactProblem = "name" | "email" | "phone" | "role" | "pick" | "duplicate";
export type ContactState =
  { status: "idle" } | { status: "saved" } | { status: "error"; error?: "generic" | "notAllowed"; fields?: Partial<Record<string, ContactProblem>> };

export type ContactInput = {
  propertyId: string;
  /** The link being edited; absent when adding. */
  linkId?: string;
  /** An existing contact of the account (from the list); absent for a new one. */
  contactId?: string;
  details?: { name: string; email: string; phone: string; address: string; note: string };
  roleKey: string;
  roleLabel: string;
  tenantVisible: boolean;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clean = (v: string | undefined, max: number) => (v ?? "").trim().replace(/\s+/g, " ").slice(0, max) || null;

function checkDetails(d: NonNullable<ContactInput["details"]>) {
  const fields: Partial<Record<string, ContactProblem>> = {};
  if (!clean(d.name, 120)) fields.name = "name";
  if (d.email.trim() && !EMAIL_RE.test(d.email.trim())) fields.email = "email";
  const phone = d.phone.trim();
  if (phone && (phone.length < 3 || phone.length > 40 || !/^[+0-9()\s/-]+$/.test(phone))) fields.phone = "phone";
  return fields;
}

const detailsRow = (d: NonNullable<ContactInput["details"]>) => ({
  name: clean(d.name, 120)!,
  email: d.email.trim().toLowerCase() || null,
  phone: clean(d.phone, 40),
  address: clean(d.address, 200),
  note: (d.note ?? "").trim().slice(0, 500) || null,
});

function failed(error: { code?: string; message?: string } | null): ContactState {
  if (!error) return { status: "saved" };
  if (error.code === "23505") return { status: "error", fields: { role: "duplicate" } };
  if (error.code === "42501" || error.message === "contact_not_in_account") return { status: "error", error: "notAllowed" };
  console.error("contact save failed", error.code);
  return { status: "error", error: "generic" };
}

/** A role from the catalogue or typed by the person ("Kulcsos"). */
async function role(input: ContactInput): Promise<{ role_key: string | null; role_label: string | null } | null> {
  if (input.roleKey) {
    const { contact_role } = await loadCatalog("contact_role");
    return contact_role.some((r) => r.key === input.roleKey && r.active) ? { role_key: input.roleKey, role_label: null } : null;
  }
  const label = clean(input.roleLabel, 40);
  return label ? { role_key: null, role_label: label } : null;
}

/** Adds a contact to the property: one from the account's list, or a new one that joins the list. */
export async function addPropertyContact(input: ContactInput): Promise<ContactState> {
  const r = await role(input);
  const fields: Partial<Record<string, ContactProblem>> = r ? {} : { role: "role" };
  if (!input.contactId && !input.details) fields.pick = "pick";
  if (!input.contactId && input.details) Object.assign(fields, checkDetails(input.details));
  if (Object.keys(fields).length) return { status: "error", fields };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { data: property } = await supabase.from("properties").select("account_id").eq("id", input.propertyId).maybeSingle();
  if (!property || !auth?.claims) return { status: "error", error: "notAllowed" };

  let contactId = input.contactId;
  if (!contactId && input.details) {
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        account_id: property.account_id,
        ...detailsRow(input.details),
        default_role_key: r!.role_key,
        default_role_label: r!.role_label,
        created_by: auth.claims.sub,
      })
      .select("id")
      .single();
    if (error || !data) return failed(error ?? { message: "no_row" });
    contactId = data.id;
  }
  const { error } = await supabase
    .from("property_contacts")
    .insert({ property_id: input.propertyId, contact_id: contactId!, ...r!, tenant_visible: input.tenantVisible });
  return failed(error);
}

/** Changes the contact's details (everywhere it is used) and its role and visibility here. */
export async function updatePropertyContact(input: ContactInput): Promise<ContactState> {
  const r = await role(input);
  const fields: Partial<Record<string, ContactProblem>> = r ? {} : { role: "role" };
  if (input.details) Object.assign(fields, checkDetails(input.details));
  if (Object.keys(fields).length) return { status: "error", fields };
  if (!input.linkId || !input.contactId || !input.details) return { status: "error", error: "generic" };
  const supabase = await createClient();
  const { data: c, error: ce } = await supabase.from("contacts").update(detailsRow(input.details)).eq("id", input.contactId).select("id");
  if (ce || !c?.length) return ce ? failed(ce) : { status: "error", error: "notAllowed" };
  const { data: l, error: le } = await supabase
    .from("property_contacts")
    .update({ ...r!, tenant_visible: input.tenantVisible })
    .eq("id", input.linkId)
    .eq("property_id", input.propertyId)
    .select("id");
  return le ? failed(le) : l?.length ? { status: "saved" } : { status: "error", error: "notAllowed" };
}

/** Takes the contact off this property; it stays in the account's list. */
export async function removePropertyContact(propertyId: string, linkId: string): Promise<ContactState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("property_contacts").delete().eq("id", linkId).eq("property_id", propertyId).select("id");
  return error ? failed(error) : data?.length ? { status: "saved" } : { status: "error", error: "notAllowed" };
}

export type OwnerInput = {
  propertyId: string;
  kind: "" | "self" | "account" | "other";
  contactId?: string;
  newContact?: { name: string; phone: string; email: string };
};

/**
 * The owner: me, the company, or someone else from the contacts (a new contact joins the list). Someone else also shows
 * among the property's contacts as "Tulajdonos".
 */
export async function saveOwner(input: OwnerInput): Promise<ContactState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { data: property } = await supabase.from("properties").select("account_id").eq("id", input.propertyId).maybeSingle();
  if (!property || !auth?.claims) return { status: "error", error: "notAllowed" };
  let contactId: string | null = null;
  if (input.kind === "other") {
    if (input.contactId) contactId = input.contactId;
    else if (input.newContact) {
      const d = { ...input.newContact, address: "", note: "" };
      const fields = checkDetails(d);
      if (Object.keys(fields).length) return { status: "error", fields };
      const { data, error } = await supabase
        .from("contacts")
        .insert({ account_id: property.account_id, ...detailsRow(d), default_role_key: "owner", created_by: auth.claims.sub })
        .select("id")
        .single();
      if (error || !data) return failed(error ?? { message: "no_row" });
      contactId = data.id;
    } else return { status: "error", fields: { pick: "pick" } };
  }
  const { error } = await supabase
    .from("property_management")
    .upsert({ property_id: input.propertyId, owner_kind: input.kind || null, owner_contact_id: contactId }, { onConflict: "property_id" });
  if (error) return failed(error);
  if (contactId) {
    const { data: linked } = await supabase
      .from("property_contacts")
      .select("id")
      .eq("property_id", input.propertyId)
      .eq("contact_id", contactId)
      .eq("role_key", "owner");
    if (!linked?.length) {
      const { error: le } = await supabase.from("property_contacts").insert({ property_id: input.propertyId, contact_id: contactId, role_key: "owner" });
      if (le && le.code !== "23505") return failed(le);
    }
  }
  return { status: "saved" };
}
