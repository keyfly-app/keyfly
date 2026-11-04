"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/components/Toaster";
import { Button, INPUT_CLASS, Label, Notice, TextField, buttonClass } from "@/components/ui/form";
import { saveOwner } from "./contact-actions";
import { saveManagement } from "./actions";

export type OwnerProps = {
  propertyId: string;
  company: boolean;
  kind: "" | "self" | "account" | "other";
  contactId: string;
  contacts: { id: string; name: string }[];
  responsible: string;
  team: { id: string; name: string }[];
};

/**
 * "Tulajdon és kezelés" in edit mode: whose property it is – mine (personal account) or the company's, or someone else
 * from the contacts (or a new contact) – and, in a company, the responsible colleague.
 */
export function OwnerForm({ p, close }: { p: OwnerProps; close: () => void }) {
  const t = useTranslations("properties.data");
  const ct = useTranslations("properties.contacts");
  const id = useId();
  const router = useRouter();
  const [kind, setKind] = useState(p.kind);
  const [contactId, setContactId] = useState(p.contactId || (p.contacts.length ? "" : "__new"));
  const [fresh, setFresh] = useState({ name: "", phone: "", email: "" });
  const [responsible, setResponsible] = useState(p.responsible);
  const [fields, setFields] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const mine = p.company ? "account" : "self";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError(null);
      const owner = await saveOwner({
        propertyId: p.propertyId,
        kind,
        contactId: kind === "other" && contactId !== "__new" ? contactId || undefined : undefined,
        newContact: kind === "other" && contactId === "__new" ? fresh : undefined,
      });
      if (owner.status === "error") {
        setFields(owner.fields ?? {});
        if (owner.error) setError(ct(`errors.${owner.error}`));
        return;
      }
      if (p.company) {
        const data = new FormData();
        data.set("propertyId", p.propertyId);
        data.set("responsible", responsible);
        const m = await saveManagement({ status: "idle" }, data);
        if (m.status === "error") return setError(t(`errors.${m.error === "notAllowed" ? "notAllowed" : "generic"}`));
      }
      toast(t("saved"));
      close();
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && <Notice kind="error">{error}</Notice>}
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium">{t("owner.title")}</legend>
        <div className="flex flex-col gap-1.5">
          {([mine, "other"] as const).map((k) => (
            <label
              key={k}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-field px-3 text-sm has-checked:border-ink has-checked:bg-mist/60 has-focus-visible:outline-3 has-focus-visible:outline-brand"
            >
              <input
                type="radio"
                name="ownerKind"
                checked={kind === k}
                onChange={() => setKind(k)}
                onClick={() => kind === k && setKind("")}
                className="size-4 accent-ink"
              />
              {t(`owner.${k}`)}
            </label>
          ))}
        </div>
      </fieldset>
      {kind === "other" && (
        <div className="flex flex-col gap-3 rounded-lg bg-paper p-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-who`}>{t("owner.pick")}</Label>
            <select
              id={`${id}-who`}
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              aria-invalid={fields.pick ? true : undefined}
              className={`${INPUT_CLASS} appearance-auto ${contactId ? "" : "text-muted"}`}
            >
              <option value="">{t("owner.pickPlaceholder")}</option>
              {p.contacts.map((c) => (
                <option key={c.id} value={c.id} className="text-ink">
                  {c.name}
                </option>
              ))}
              <option value="__new" className="text-ink">
                {t("owner.newContact")}
              </option>
            </select>
            {fields.pick && <p className="text-[12.5px] font-medium text-danger-ink">{ct("errors.pick")}</p>}
          </div>
          {contactId === "__new" && (
            <>
              <TextField
                id={`${id}-name`}
                label={t("owner.name")}
                value={fresh.name}
                onChange={(e) => setFresh((f) => ({ ...f, name: e.target.value }))}
                maxLength={120}
                error={fields.name ? ct("errors.name") : undefined}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  id={`${id}-phone`}
                  type="tel"
                  label={t("owner.phone")}
                  optional={t("owner.optional")}
                  value={fresh.phone}
                  maxLength={40}
                  onChange={(e) => setFresh((f) => ({ ...f, phone: e.target.value }))}
                  error={fields.phone ? ct("errors.phone") : undefined}
                />
                <TextField
                  id={`${id}-email`}
                  type="email"
                  label={t("owner.email")}
                  optional={t("owner.optional")}
                  value={fresh.email}
                  maxLength={254}
                  onChange={(e) => setFresh((f) => ({ ...f, email: e.target.value }))}
                  error={fields.email ? ct("errors.email") : undefined}
                />
              </div>
            </>
          )}
        </div>
      )}
      {p.company && (
        <div className="flex flex-col gap-1.5 sm:max-w-[320px]">
          <Label htmlFor={`${id}-resp`}>{t("management.responsible")}</Label>
          <select id={`${id}-resp`} value={responsible} onChange={(e) => setResponsible(e.target.value)} className={`${INPUT_CLASS} appearance-auto`}>
            <option value="">{t("management.nobody")}</option>
            {p.team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-2 border-t border-paper pt-4 sm:flex-row">
        <Button pending={pending} fit>
          {t("save")}
        </Button>
        <button type="button" onClick={close} className={buttonClass("secondary", true)}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
