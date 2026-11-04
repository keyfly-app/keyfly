"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Button, FieldError, INPUT_CLASS, Label, Notice, Optional, TextField, buttonClass } from "@/components/ui/form";
import { offered, type CatalogOption } from "@/features/catalog/types";
import { saveAddress, saveFeatures, saveIdentity, saveManagement, type FeaturesInput, type SaveState } from "./actions";
import { AddressFields, type AddressValues } from "./AddressFields";
import type { FeatureField } from "./kinds";
import { TypeTiles } from "./TypeTiles";

export type Section = "identity" | "address" | "features" | "management" | "condo" | "note";
type Row = [string, string | null];

export type DataCardsProps = {
  propertyId: string;
  editable: boolean;
  company: boolean;
  open: Section | null;
  types: CatalogOption[];
  identity: {
    rows: Row[];
    label: string;
    ownRef: string;
    kind: string;
    otherLabel: string;
    namePlaceholder: string;
  };
  address: { rows: Row[]; values: AddressValues; parcel: string };
  features: {
    rows: Row[];
    fields: FeatureField[];
    values: Omit<FeaturesInput, "propertyId" | "newExtras">;
    options: {
      heating: CatalogOption[];
      energy: CatalogOption[];
      parking: CatalogOption[];
      furnishing: CatalogOption[];
      outdoor: CatalogOption[];
      extras: CatalogOption[];
    };
    accountExtras: { id: string; label: string }[];
  };
  management: {
    rows: Row[];
    responsible: string;
    team: { id: string; name: string }[];
  };
  condo: { rows: Row[]; commonCharge: string };
  note: { text: string };
};

/** The saved state turns into a toast and a fresh page; a refusal stays in the card. */
function useSaved(state: SaveState, close: () => void) {
  const t = useTranslations("properties.data");
  const router = useRouter();
  useEffect(() => {
    if (state.status !== "saved") return;
    toast(t("saved"));
    close();
    router.refresh();
  }, [state, close, router, t]);
}

function CardFrame({ id, title, onEdit, editing, children }: { id: string; title: string; onEdit?: () => void; editing: boolean; children: React.ReactNode }) {
  const t = useTranslations("properties.data");
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`flex scroll-mt-20 flex-col gap-3 rounded-xl border bg-surface p-5 ${editing ? "border-ink" : "border-line"}`}
    >
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="text-[15px] leading-5 font-semibold">
          {title}
        </h2>
        {onEdit && !editing && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={t("editLabel", { section: title })}
            className="inline-flex min-h-11 items-center text-[13.5px] font-semibold text-brand hover:underline sm:min-h-6"
          >
            {t("edit")}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="flex flex-col text-sm">
      {rows.map(([k, v], i) => (
        <div key={k} className={`flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4 ${i ? "border-t border-paper" : ""}`}>
          <dt className="flex-none text-[12.5px] text-muted sm:text-sm">{k}</dt>
          <dd className={`min-w-0 [overflow-wrap:anywhere] sm:text-right ${v ? "font-medium" : "text-muted"}`}>{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function FormActions({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  const t = useTranslations("properties.data");
  return (
    <div className="flex flex-col gap-2 border-t border-paper pt-4 sm:flex-row">
      <Button pending={pending} fit>
        {t("save")}
      </Button>
      <button type="button" onClick={onCancel} className={buttonClass("secondary", true)}>
        {t("cancel")}
      </button>
    </div>
  );
}

function GeneralError({ state }: { state: SaveState }) {
  const t = useTranslations("properties.data.errors");
  if (state.status !== "error" || !state.error) return null;
  return <Notice kind="error">{t(state.error === "notAllowed" ? "notAllowed" : "generic")}</Notice>;
}

/** Focus the first field to fix after a refused save. */
function useFocusError(state: SaveState, form: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (state.status === "error") form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state, form]);
}

function IdentityForm({ p, types, close }: { p: DataCardsProps; types: CatalogOption[]; close: () => void }) {
  const t = useTranslations("properties.data");
  const n = useTranslations("properties.new");
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(saveIdentity, {
    status: "idle",
  } as SaveState);
  useSaved(state, close);
  useFocusError(state, form);
  const [kind, setKind] = useState(p.identity.kind);
  const [other, setOther] = useState(p.identity.otherLabel);
  const f = state.status === "error" ? (state.fields ?? {}) : {};
  // A retired type stays selectable for the property that already has it.
  const options = types.filter((o) => o.active || o.key === p.identity.kind);
  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="propertyId" value={p.propertyId} />
      <GeneralError state={state} />
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
        <TextField
          id={`${id}-name`}
          name="label"
          label={t("identity.name")}
          optional={n("optional")}
          defaultValue={p.identity.label}
          placeholder={p.identity.namePlaceholder}
          maxLength={120}
        />
        <TextField
          id={`${id}-ref`}
          name="ownRef"
          label={t("identity.ownRef")}
          optional={n("optional")}
          defaultValue={p.identity.ownRef}
          placeholder={n("ownRefPlaceholder")}
          maxLength={30}
          error={f.ownRef ? t("errors.ownRefTaken") : undefined}
        />
      </div>
      <TypeTiles
        legend={t("identity.type")}
        options={options}
        value={kind}
        onChange={setKind}
        otherLabel={other}
        onOtherLabel={setOther}
        labels={{
          other: t("identity.otherLabel"),
          otherPlaceholder: n("otherPlaceholder"),
        }}
        error={f.kind ? n("errors.kind") : undefined}
        otherError={f.otherLabel ? t("errors.otherLabel") : undefined}
      />
      <FormActions pending={pending} onCancel={close} />
    </form>
  );
}

function AddressForm({ p, close }: { p: DataCardsProps; close: () => void }) {
  const t = useTranslations("properties.data");
  const lr = useTranslations("leaseRequest.errors");
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(saveAddress, {
    status: "idle",
  } as SaveState);
  useSaved(state, close);
  useFocusError(state, form);
  const [values, setValues] = useState(p.address.values);
  const f = state.status === "error" ? (state.fields ?? {}) : {};
  const err = (k: keyof AddressValues) => (f[k] ? lr(f[k] === "postalCode" ? "postalCode" : "required") : undefined);
  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="propertyId" value={p.propertyId} />
      <GeneralError state={state} />
      <AddressFields
        values={values}
        onChange={setValues}
        initial="picked"
        errors={{
          postalCode: err("postalCode"),
          city: err("city"),
          streetName: err("streetName"),
          streetType: err("streetType"),
          houseNumber: err("houseNumber"),
        }}
      />
      <div className="sm:max-w-[280px]">
        <TextField
          id={`${id}-parcel`}
          name="parcel"
          label={t("address.parcel")}
          defaultValue={p.address.parcel}
          placeholder={t("address.parcelPlaceholder")}
          maxLength={30}
          autoCapitalize="characters"
          error={f.parcel ? t("errors.parcel") : undefined}
        />
      </div>
      <FormActions pending={pending} onCancel={close} />
    </form>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: CatalogOption[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT_CLASS} appearance-auto ${value ? "" : "text-muted"}`}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.key} value={o.key} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Choice({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium">{legend}</legend>
      <div className="flex rounded-lg bg-paper p-0.5">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-center text-[13px] leading-4 font-medium text-muted has-checked:bg-surface has-checked:text-ink has-checked:shadow-[0_1px_2px_rgb(12_31_25/0.12)] has-focus-visible:outline-3 has-focus-visible:outline-brand sm:min-h-9"
          >
            {/* A second click on the chosen value clears it: "not given" stays possible. */}
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              onClick={() => value === o.value && onChange("")}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  error,
  inputMode = "numeric",
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  error?: string;
  inputMode?: "numeric" | "decimal";
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={max ?? 8}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${INPUT_CLASS} ${unit ? "pr-11" : ""}`}
        />
        {unit && (
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted">
            {unit}
          </span>
        )}
      </div>
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

function FeaturesForm({ p, close }: { p: DataCardsProps; close: () => void }) {
  const t = useTranslations("properties.data");
  const id = useId();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [v, setV] = useState(p.features.values);
  const [newExtras, setNewExtras] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<SaveState>({ status: "idle" });
  const [pending, start] = useTransition();
  useFocusError(state, form);
  const has = (f: FeatureField) => p.features.fields.includes(f);
  const set =
    <K extends keyof typeof v>(k: K) =>
    (x: (typeof v)[K]) =>
      setV((s) => ({ ...s, [k]: x }));
  const f = state.status === "error" ? (state.fields ?? {}) : {};
  const numErr = (k: string, min: number, max: number) =>
    f[k] === "number" ? t("errors.number") : f[k] === "range" ? t("errors.range", { min, max }) : undefined;
  const toggle = (list: "extras" | "ownExtras", key: string) => set(list)(v[list].includes(key) ? v[list].filter((x) => x !== key) : [...v[list], key]);
  const outdoorOf = (kind: string) => v.outdoor.find((o) => o.kind === kind);
  const addTyped = () => {
    const label = typed.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!label) return;
    const same = (x: string) => x.toLowerCase() === label.toLowerCase();
    const existing = p.features.accountExtras.find((e) => same(e.label));
    if (existing) {
      if (!v.ownExtras.includes(existing.id)) toggle("ownExtras", existing.id);
    } else if (!newExtras.some(same)) setNewExtras((n) => [...n, label]);
    setTyped("");
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const next = await saveFeatures({
        propertyId: p.propertyId,
        ...v,
        newExtras,
      });
      setState(next);
      if (next.status === "saved") {
        toast(t("saved"));
        close();
        router.refresh();
      }
    });
  };
  const chip = "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium sm:min-h-9";
  const on = `${chip} border-ink bg-mist/60 text-ink`;
  const off = `${chip} border-field bg-surface text-ink-soft hover:border-ink`;
  const choose = t("features.choose");

  return (
    <form ref={form} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <GeneralError state={state} />
      <div className={`grid grid-cols-2 gap-3 ${has("rooms") ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
        <NumberField
          id={`${id}-area`}
          label={t("features.area")}
          value={v.area}
          onChange={set("area")}
          unit={t("features.unit")}
          inputMode="decimal"
          error={numErr("area", 1, 99999)}
        />
        {has("rooms") && (
          <NumberField id={`${id}-rooms`} label={t("features.fullRooms")} value={v.rooms} onChange={set("rooms")} max={2} error={numErr("rooms", 0, 50)} />
        )}
        {has("rooms") && (
          <NumberField
            id={`${id}-half`}
            label={t("features.halfRooms")}
            value={v.halfRooms}
            onChange={set("halfRooms")}
            max={2}
            error={numErr("halfRooms", 0, 50)}
          />
        )}
        <NumberField
          id={`${id}-year`}
          label={t("features.builtYear")}
          value={v.builtYear}
          onChange={set("builtYear")}
          max={4}
          error={numErr("builtYear", 1500, 2100)}
        />
      </div>

      {has("outdoor") && (
        <fieldset className="flex flex-col gap-2 border-t border-paper pt-4">
          <legend className="mb-1 text-[13px] font-medium">{t("features.outdoor")}</legend>
          {offered(p.features.options.outdoor).map((o) => {
            const cur = outdoorOf(o.key);
            return (
              <div key={o.key} className="grid min-h-11 grid-cols-[minmax(0,1fr)_9rem] items-center gap-3">
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(cur)}
                    onChange={() => set("outdoor")(cur ? v.outdoor.filter((x) => x.kind !== o.key) : [...v.outdoor, { kind: o.key, area: "" }])}
                    className="size-5 flex-none accent-ink"
                  />
                  {o.label}
                </label>
                {cur && (
                  <div className="relative">
                    <input
                      aria-label={t("features.outdoorArea", { name: o.label })}
                      inputMode="decimal"
                      maxLength={7}
                      value={cur.area}
                      onChange={(e) => set("outdoor")(v.outdoor.map((x) => (x.kind === o.key ? { ...x, area: e.target.value } : x)))}
                      aria-invalid={f[`outdoor.${o.key}`] ? true : undefined}
                      className={`${INPUT_CLASS} pr-11`}
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted">
                      {t("features.unit")}
                    </span>
                  </div>
                )}
                {f[`outdoor.${o.key}`] && <FieldError id={`${id}-out-${o.key}`} message={t("errors.number")} className="col-span-2" />}
              </div>
            );
          })}
        </fieldset>
      )}

      {(has("heating") || has("energy_rating") || has("parking")) && (
        <div className="grid gap-3 border-t border-paper pt-4 sm:grid-cols-3">
          {has("heating") && (
            <Select
              id={`${id}-heat`}
              label={t("features.heating")}
              value={v.heating}
              onChange={set("heating")}
              options={offered(p.features.options.heating)}
              placeholder={choose}
            />
          )}
          {has("energy_rating") && (
            <Select
              id={`${id}-energy`}
              label={t("features.energy")}
              value={v.energy}
              onChange={set("energy")}
              options={offered(p.features.options.energy)}
              placeholder={choose}
            />
          )}
          {has("parking") && (
            <Select
              id={`${id}-park`}
              label={t("features.parking")}
              value={v.parking}
              onChange={set("parking")}
              options={offered(p.features.options.parking)}
              placeholder={choose}
            />
          )}
        </div>
      )}

      {(has("lift") || has("furnishing")) && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,16rem)]">
          {has("lift") && (
            <Choice
              legend={t("features.lift")}
              name="lift"
              value={v.lift}
              onChange={(x) => set("lift")(x as FeaturesInput["lift"])}
              options={[
                { value: "yes", label: t("features.liftYes") },
                { value: "no", label: t("features.liftNo") },
              ]}
            />
          )}
          {has("furnishing") && (
            <Choice
              legend={t("features.furnishing")}
              name="furnishing"
              value={v.furnishing}
              onChange={set("furnishing")}
              options={offered(p.features.options.furnishing).map((o) => ({
                value: o.key,
                label: o.label,
              }))}
            />
          )}
        </div>
      )}

      {has("extras") && (
        <fieldset className="flex flex-col gap-2.5 border-t border-paper pt-4">
          <legend className="mb-1 text-[13px] font-medium">
            {t("features.extras")} <Optional>{t("features.extrasOptional")}</Optional>
          </legend>
          <div className="flex flex-wrap gap-2">
            {offered(p.features.options.extras).map((o) => (
              <button
                key={o.key}
                type="button"
                aria-pressed={v.extras.includes(o.key)}
                onClick={() => toggle("extras", o.key)}
                className={v.extras.includes(o.key) ? on : off}
              >
                <Icon name={v.extras.includes(o.key) ? "check" : "plus"} size={14} strokeWidth={2.25} />
                {o.label}
              </button>
            ))}
            {p.features.accountExtras.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={v.ownExtras.includes(e.id)}
                onClick={() => toggle("ownExtras", e.id)}
                className={v.ownExtras.includes(e.id) ? on : off}
              >
                <Icon name={v.ownExtras.includes(e.id) ? "check" : "plus"} size={14} strokeWidth={2.25} />
                {e.label}
              </button>
            ))}
            {newExtras.map((label) => (
              <span key={label} className={`${on} pr-1`}>
                <Icon name="check" size={14} strokeWidth={2.25} />
                {label}
                <button
                  type="button"
                  aria-label={t("features.removeExtra", { name: label })}
                  onClick={() => setNewExtras((n) => n.filter((x) => x !== label))}
                  className="flex size-8 items-center justify-center rounded-full text-muted hover:text-ink sm:size-6"
                >
                  <Icon name="x" size={13} strokeWidth={2.25} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex max-w-[360px] gap-2">
            <label htmlFor={`${id}-extra`} className="sr-only">
              {t("features.addExtra")}
            </label>
            <input
              id={`${id}-extra`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t("features.addExtraPlaceholder")}
              maxLength={40}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTyped();
                }
              }}
              className={INPUT_CLASS}
            />
            <button type="button" onClick={addTyped} disabled={!typed.trim()} className={`${buttonClass("secondary")} w-auto flex-none disabled:opacity-50`}>
              {t("features.addExtraButton")}
            </button>
          </div>
        </fieldset>
      )}
      <FormActions pending={pending} onCancel={close} />
    </form>
  );
}

function ManagementForm({ p, field, close }: { p: DataCardsProps; field: "management" | "condo" | "note"; close: () => void }) {
  const t = useTranslations("properties.data");
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(saveManagement, {
    status: "idle",
  } as SaveState);
  useSaved(state, close);
  useFocusError(state, form);
  const f = state.status === "error" ? (state.fields ?? {}) : {};
  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="propertyId" value={p.propertyId} />
      <GeneralError state={state} />
      {field === "management" && (
        <div className="flex flex-col gap-1.5 sm:max-w-[320px]">
          <Label htmlFor={`${id}-resp`}>{t("management.responsible")}</Label>
          <select id={`${id}-resp`} name="responsible" defaultValue={p.management.responsible} className={`${INPUT_CLASS} appearance-auto`}>
            <option value="">{t("management.nobody")}</option>
            {p.management.team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {field === "condo" && (
        <div className="sm:max-w-[240px]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-cc`}>{t("condo.commonCharge")}</Label>
            <div className="relative">
              <input
                id={`${id}-cc`}
                name="commonCharge"
                inputMode="numeric"
                defaultValue={p.condo.commonCharge}
                maxLength={11}
                aria-invalid={f.commonCharge ? true : undefined}
                aria-describedby={f.commonCharge ? `${id}-cc-error` : undefined}
                className={`${INPUT_CLASS} pr-20`}
              />
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted">
                {t("condo.perMonth")}
              </span>
            </div>
            {f.commonCharge && <FieldError id={`${id}-cc-error`} message={t("errors.number")} />}
          </div>
        </div>
      )}
      {field === "note" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-note`} className="sr-only">
            {t("note.title")}
          </label>
          <textarea
            id={`${id}-note`}
            name="note"
            defaultValue={p.note.text}
            placeholder={t("note.placeholder")}
            maxLength={2000}
            rows={4}
            className={`${INPUT_CLASS} h-auto min-h-28 py-2.5 leading-5`}
          />
        </div>
      )}
      <FormActions pending={pending} onCancel={close} />
    </form>
  );
}

/**
 * "Adatok" (canvas "Ingatlan – adatok", "… – jellemzők szerkesztése"): every group as a card with its own Edit; one card
 * is edited in place at a time (the features form takes the full width). `open` comes from ?edit=… links.
 */
export function DataCards(p: DataCardsProps) {
  const t = useTranslations("properties.data");
  const [open, setOpen] = useState<Section | null>(p.editable ? p.open : null);
  useEffect(() => {
    if (p.open) document.getElementById(`card-${p.open}`)?.scrollIntoView({ block: "start" });
  }, [p.open]);
  const close = () => setOpen(null);
  const edit = (s: Section) => (p.editable ? () => setOpen(s) : undefined);

  const identity = (
    <CardFrame id="card-identity" title={t("identity.title")} onEdit={edit("identity")} editing={open === "identity"}>
      {open === "identity" ? <IdentityForm p={p} types={p.types} close={close} /> : <Rows rows={p.identity.rows} />}
    </CardFrame>
  );
  const address = (
    <CardFrame id="card-address" title={t("address.title")} onEdit={edit("address")} editing={open === "address"}>
      {open === "address" ? <AddressForm p={p} close={close} /> : <Rows rows={p.address.rows} />}
    </CardFrame>
  );
  const features = (
    <CardFrame id="card-features" title={t("features.title")} onEdit={edit("features")} editing={open === "features"}>
      {open === "features" ? <FeaturesForm p={p} close={close} /> : <Rows rows={p.features.rows} />}
    </CardFrame>
  );
  const management = p.company && (
    <CardFrame id="card-management" title={t("management.title")} onEdit={edit("management")} editing={open === "management"}>
      {open === "management" ? <ManagementForm p={p} field="management" close={close} /> : <Rows rows={p.management.rows} />}
    </CardFrame>
  );
  const condo = (
    <CardFrame id="card-condo" title={t("condo.title")} onEdit={edit("condo")} editing={open === "condo"}>
      {open === "condo" ? <ManagementForm p={p} field="condo" close={close} /> : <Rows rows={p.condo.rows} />}
    </CardFrame>
  );
  const note = (
    <CardFrame id="card-note" title={t("note.title")} onEdit={edit("note")} editing={open === "note"}>
      {open === "note" ? (
        <ManagementForm p={p} field="note" close={close} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className={`text-sm whitespace-pre-line [overflow-wrap:anywhere] ${p.note.text ? "" : "text-muted"}`}>{p.note.text || "—"}</p>
          <p className="text-[12.5px] text-muted">{t(p.company ? "note.hintCompany" : "note.hintPersonal")}</p>
        </div>
      )}
    </CardFrame>
  );
  const wide = open === "features";
  return (
    <div className="flex flex-col gap-4">
      {wide && features}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {identity}
          {address}
          {management}
        </div>
        <div className="flex flex-col gap-4">
          {!wide && features}
          {condo}
          {note}
        </div>
      </div>
    </div>
  );
}
