"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, FieldError, INPUT_CLASS, Label, Notice, TextField, buttonClass } from "@/components/ui/form";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { offered, type CatalogOption } from "@/features/catalog/types";
import { addPropertyContact, removePropertyContact, updatePropertyContact, type ContactInput, type ContactState } from "./contact-actions";

export type LinkedContact = {
  linkId: string;
  contactId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  roleKey: string | null;
  roleLabel: string | null;
  role: string;
  tenantVisible: boolean;
};
export type ListContact = { id: string; name: string; role: string; properties: number };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Role select with the catalogue's roles and "own role…", which opens a text field. */
function RoleField({
  id,
  roles,
  roleKey,
  roleLabel,
  onChange,
  error,
  label,
}: {
  id: string;
  roles: CatalogOption[];
  roleKey: string;
  roleLabel: string;
  onChange: (key: string, label: string) => void;
  error?: string;
  label: string;
}) {
  const t = useTranslations("properties.contacts.dialog");
  const [own, setOwn] = useState(!roleKey && Boolean(roleLabel));
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={own ? "__own" : roleKey}
        onChange={(e) => {
          const v = e.target.value;
          setOwn(v === "__own");
          onChange(v === "__own" ? "" : v, v === "__own" ? roleLabel : "");
        }}
        aria-invalid={error && !own ? true : undefined}
        aria-describedby={`${id}-hint`}
        className={`${INPUT_CLASS} appearance-auto ${own || roleKey ? "" : "text-muted"}`}
      >
        <option value="">{t("choose")}</option>
        {offered(roles).map((r) => (
          <option key={r.key} value={r.key} className="text-ink">
            {r.label}
          </option>
        ))}
        <option value="__own" className="text-ink">
          {t("ownRole")}
        </option>
      </select>
      {own ? (
        <input
          aria-label={t("ownRoleLabel")}
          value={roleLabel}
          onChange={(e) => onChange("", e.target.value)}
          placeholder={t("ownRolePlaceholder")}
          maxLength={40}
          aria-invalid={error ? true : undefined}
          className={`${INPUT_CLASS} mt-1`}
          autoFocus
        />
      ) : null}
      <p id={`${id}-hint`} className="text-[12.5px] leading-[18px] text-muted">
        {t("roleHint")}
      </p>
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

type Draft = {
  name: string;
  email: string;
  phone: string;
  address: string;
  note: string;
  roleKey: string;
  roleLabel: string;
  tenantVisible: boolean;
  contactId: string;
};
const EMPTY: Draft = { name: "", email: "", phone: "", address: "", note: "", roleKey: "", roleLabel: "", tenantVisible: false, contactId: "" };

/** "Kapcsolat hozzáadása" / "… szerkesztése" (canvas "Ingatlan – kapcsolat hozzáadása"). */
function ContactDialog({
  open,
  onClose,
  propertyId,
  roles,
  list,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  roles: CatalogOption[];
  list: ListContact[];
  editing: LinkedContact | null;
}) {
  const t = useTranslations("properties.contacts");
  const d = useTranslations("properties.contacts.dialog");
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "new">(editing || list.length === 0 ? "new" : "list");
  const [v, setV] = useState<Draft>(() =>
    editing
      ? {
          name: editing.name,
          email: editing.email ?? "",
          phone: editing.phone ?? "",
          address: editing.address ?? "",
          note: editing.note ?? "",
          roleKey: editing.roleKey ?? "",
          roleLabel: editing.roleLabel ?? "",
          tenantVisible: editing.tenantVisible,
          contactId: editing.contactId,
        }
      : EMPTY,
  );
  const [q, setQ] = useState("");
  const [state, setState] = useState<ContactState>({ status: "idle" });
  const [pending, start] = useTransition();
  const f = state.status === "error" ? (state.fields ?? {}) : {};
  const set = (k: keyof Draft) => (x: string | boolean) => setV((s) => ({ ...s, [k]: x }));
  const fold = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const shown = useMemo(() => list.filter((c) => !q.trim() || fold(`${c.name} ${c.role}`).includes(fold(q.trim()))), [list, q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: ContactInput = {
      propertyId,
      linkId: editing?.linkId,
      contactId: mode === "list" || editing ? v.contactId || undefined : undefined,
      details: mode === "new" || editing ? { name: v.name, email: v.email, phone: v.phone, address: v.address, note: v.note } : undefined,
      roleKey: v.roleKey,
      roleLabel: v.roleLabel,
      tenantVisible: v.tenantVisible,
    };
    start(async () => {
      const next = await (editing ? updatePropertyContact(input) : addPropertyContact(input));
      setState(next);
      if (next.status === "saved") {
        toast(t(editing ? "saved" : "added"));
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title={d(editing ? "editTitle" : "addTitle")} closeLabel={d("close")} wide>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {state.status === "error" && state.error && <Notice kind="error">{t(`errors.${state.error}`)}</Notice>}
        {!editing && list.length > 0 && (
          <div role="radiogroup" aria-label={d("addTitle")} className="flex rounded-lg bg-paper p-0.5">
            {(["list", "new"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className="flex min-h-11 flex-1 items-center justify-center rounded-md text-[13px] font-medium text-muted aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-[0_1px_2px_rgb(12_31_25/0.12)] sm:min-h-9"
              >
                {d(m === "list" ? "fromList" : "new")}
              </button>
            ))}
          </div>
        )}

        {mode === "list" && !editing ? (
          <>
            <div className="relative">
              <Icon name="search" size={17} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input aria-label={d("search")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={d("search")} className={`${INPUT_CLASS} pl-10`} />
            </div>
            <fieldset aria-describedby={f.pick ? "pick-error" : undefined} className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              <legend className="sr-only">{d("fromList")}</legend>
              {shown.length === 0 && <p className="px-1 py-2 text-sm text-muted">{list.length ? d("noMatch") : d("noContacts")}</p>}
              {shown.map((c) => (
                <label
                  key={c.id}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-paper has-checked:bg-mist has-focus-visible:outline-3 has-focus-visible:outline-brand"
                >
                  <input type="radio" name="contact" className="sr-only" checked={v.contactId === c.id} onChange={() => set("contactId")(c.id)} />
                  <Avatar initials={initials(c.name)} size={34} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold [overflow-wrap:anywhere]">{c.name}</span>
                    <span className="text-[12.5px] text-muted">{[c.role, d("properties", { count: c.properties })].filter(Boolean).join(" · ")}</span>
                  </span>
                  {v.contactId === c.id && <Icon name="check" size={16} strokeWidth={2.25} className="flex-none text-brand" />}
                </label>
              ))}
            </fieldset>
            {f.pick && <FieldError id="pick-error" message={t("errors.pick")} />}
            <RoleField
              id="role-list"
              roles={roles}
              roleKey={v.roleKey}
              roleLabel={v.roleLabel}
              label={d("roleHere")}
              onChange={(k, l) => setV((s) => ({ ...s, roleKey: k, roleLabel: l }))}
              error={f.role ? t(`errors.${f.role === "duplicate" ? "duplicate" : "role"}`) : undefined}
            />
          </>
        ) : (
          <>
            <RoleField
              id="role-new"
              roles={roles}
              roleKey={v.roleKey}
              roleLabel={v.roleLabel}
              label={d("role")}
              onChange={(k, l) => setV((s) => ({ ...s, roleKey: k, roleLabel: l }))}
              error={f.role ? t(`errors.${f.role === "duplicate" ? "duplicate" : "role"}`) : undefined}
            />
            <TextField
              id="c-name"
              label={d("name")}
              value={v.name}
              onChange={(e) => set("name")(e.target.value)}
              maxLength={120}
              autoComplete="off"
              error={f.name ? t("errors.name") : undefined}
            />
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
              <TextField
                id="c-email"
                type="email"
                inputMode="email"
                label={d("email")}
                optional={d("optional")}
                value={v.email}
                onChange={(e) => set("email")(e.target.value)}
                maxLength={254}
                autoComplete="off"
                error={f.email ? t("errors.email") : undefined}
              />
              <TextField
                id="c-phone"
                type="tel"
                inputMode="tel"
                label={d("phone")}
                optional={d("optional")}
                value={v.phone}
                onChange={(e) => set("phone")(e.target.value)}
                maxLength={40}
                autoComplete="off"
                error={f.phone ? t("errors.phone") : undefined}
              />
            </div>
            <TextField
              id="c-address"
              label={d("address")}
              optional={d("optional")}
              value={v.address}
              onChange={(e) => set("address")(e.target.value)}
              maxLength={200}
            />
            <TextField id="c-note" label={d("note")} optional={d("optional")} value={v.note} onChange={(e) => set("note")(e.target.value)} maxLength={500} />
          </>
        )}
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={v.tenantVisible} onChange={(e) => set("tenantVisible")(e.target.checked)} className="size-5 flex-none accent-ink" />
          {d("tenantSees")}
        </label>
        <DialogActions>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>
            {d("cancel")}
          </button>
          <Button pending={pending}>{d(editing ? "saveEdit" : "save")}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/**
 * "Kapcsolatok" (canvas "Ingatlan – kapcsolatok"): who to call about this property, with tap-to-call and email links.
 * Add from the account's list or as new; edit; remove from this property (the contact stays in the list).
 */
export function ContactsPanel({
  propertyId,
  editable,
  contacts,
  list,
  roles,
  openAdd,
}: {
  propertyId: string;
  editable: boolean;
  contacts: LinkedContact[];
  list: ListContact[];
  roles: CatalogOption[];
  openAdd: boolean;
}) {
  const t = useTranslations("properties.contacts");
  const router = useRouter();
  const [dialog, setDialog] = useState<{ editing: LinkedContact | null; key: number } | null>(openAdd && editable ? { editing: null, key: 0 } : null);
  const [removing, setRemoving] = useState<LinkedContact | null>(null);
  const [pending, start] = useTransition();
  const remove = () =>
    start(async () => {
      if (!removing) return;
      const r = await removePropertyContact(propertyId, removing.linkId);
      if (r.status === "saved") {
        toast(t("removed"));
        setRemoving(null);
        router.refresh();
      } else toast(t(`errors.${r.status === "error" && r.error === "notAllowed" ? "notAllowed" : "generic"}`), "error");
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <h2 className="text-[17px] leading-6 font-semibold">{t("title")}</h2>
        {editable && (
          <button type="button" onClick={() => setDialog({ editing: null, key: Date.now() })} className={`${buttonClass("secondary", true)} w-auto`}>
            <Icon name="plus" size={16} strokeWidth={2} />
            {t("add")}
          </button>
        )}
      </div>
      {contacts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-field bg-surface p-5 text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {contacts.map((c) => (
            <li key={c.linkId} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                <Avatar initials={initials(c.name)} size={40} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] leading-5 font-semibold [overflow-wrap:anywhere]">{c.name}</span>
                  <span className="text-[13px] text-muted [overflow-wrap:anywhere]">{c.role}</span>
                </div>
                {editable && (
                  <MenuPopover
                    title={c.name}
                    closeLabel={t("dialog.close")}
                    align="end"
                    width={240}
                    trigger={({ ref, open, toggle, menuId }) => (
                      <button
                        ref={ref}
                        type="button"
                        onClick={toggle}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        aria-controls={open ? menuId : undefined}
                        aria-label={t("more", { name: c.name })}
                        className="-mt-1 -mr-1.5 flex size-11 flex-none items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink sm:size-9"
                      >
                        <Icon name="more" size={18} />
                      </button>
                    )}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setDialog({ editing: c, key: Date.now() })}
                      className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-paper focus-visible:bg-paper sm:min-h-10"
                    >
                      <Icon name="edit" size={16} strokeWidth={1.75} className="flex-none text-muted" />
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setRemoving(c)}
                      className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm text-danger-ink hover:bg-paper focus-visible:bg-paper sm:min-h-10"
                    >
                      <Icon name="trash" size={16} strokeWidth={1.75} className="flex-none" />
                      {t("remove")}
                    </button>
                  </MenuPopover>
                )}
              </div>
              {(c.phone || c.email) && (
                <div className="flex flex-col gap-0.5 border-t border-paper pt-2.5">
                  {c.phone && (
                    <a
                      href={`tel:${c.phone.replace(/[^+0-9]/g, "")}`}
                      aria-label={t("call", { name: c.name })}
                      className="flex min-h-9 items-center gap-2.5 text-sm hover:text-brand"
                    >
                      <Icon name="phone" size={15} strokeWidth={1.75} className="flex-none text-muted" />
                      <span className="tabular-nums">{c.phone}</span>
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      aria-label={t("mail", { name: c.name })}
                      className="flex min-h-9 min-w-0 items-center gap-2.5 text-sm hover:text-brand"
                    >
                      <Icon name="mail" size={15} strokeWidth={1.75} className="flex-none text-muted" />
                      <span className="min-w-0 truncate">{c.email}</span>
                    </a>
                  )}
                </div>
              )}
              {c.tenantVisible && (
                <span className="flex">
                  <span className="inline-flex h-[22px] items-center rounded-md bg-info-soft px-2 text-xs font-medium text-info-ink">{t("tenantSees")}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {dialog && (
        <ContactDialog
          key={dialog.key}
          open
          onClose={() => setDialog(null)}
          propertyId={propertyId}
          roles={roles}
          list={dialog.editing ? [] : list}
          editing={dialog.editing}
        />
      )}
      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={t("removeDialog.title")}
        description={removing ? t("removeDialog.text", { name: removing.name }) : undefined}
        closeLabel={t("dialog.close")}
      >
        <DialogActions>
          <button type="button" onClick={() => setRemoving(null)} className={buttonClass("secondary")} data-autofocus>
            {t("removeDialog.cancel")}
          </button>
          <form action={remove}>
            <Button variant="danger" pending={pending}>
              {t("removeDialog.confirm")}
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </div>
  );
}
