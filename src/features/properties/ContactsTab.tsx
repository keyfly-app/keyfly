import { labelOf } from "@/features/catalog/types";
import { loadCatalog } from "@/features/catalog/load";
import { ContactsPanel, type LinkedContact } from "./ContactsPanel";
import { accountContacts } from "./load";
import type { PropertyContext } from "./PropertyFrame";

/** Server side of "Kapcsolatok": the property's contacts with their role here, and the account's list to pick from. */
export async function ContactsTab({ ctx, openAdd }: { ctx: PropertyContext; openAdd: boolean }) {
  const { property: p, account, editable } = ctx;
  const [{ contact_role: roles }, list] = await Promise.all([loadCatalog("contact_role"), editable ? accountContacts(account.id) : Promise.resolve([])]);
  const roleOf = (key: string | null, label: string | null) => (key ? labelOf(roles, key) : (label ?? ""));
  const contacts: LinkedContact[] = [...p.property_contacts]
    .filter((l) => l.contacts)
    .sort((a, b) => a.sort - b.sort || a.contacts!.name.localeCompare(b.contacts!.name, "hu"))
    .map((l) => ({
      linkId: l.id,
      contactId: l.contacts!.id,
      name: l.contacts!.name,
      email: l.contacts!.email,
      phone: l.contacts!.phone,
      address: l.contacts!.address,
      note: l.contacts!.note,
      roleKey: l.role_key,
      roleLabel: l.role_label,
      role: roleOf(l.role_key, l.role_label),
      tenantVisible: l.tenant_visible,
    }));
  return (
    <ContactsPanel
      propertyId={p.id}
      editable={editable}
      contacts={contacts}
      list={list.map((c) => ({ id: c.id, name: c.name, role: roleOf(c.default_role_key, c.default_role_label), properties: c.properties }))}
      roles={roles}
      openAdd={openAdd}
    />
  );
}
