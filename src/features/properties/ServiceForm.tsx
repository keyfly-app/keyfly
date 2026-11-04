"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, isIconName } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Drawer } from "@/components/ui/Drawer";
import { Button, FieldError, INPUT_CLASS, Label, Notice, Optional, buttonClass } from "@/components/ui/form";
import { asksLabel, offered, type CatalogOption } from "@/features/catalog/types";
import { saveService, type ServiceInput, type ServiceState } from "./service-actions";

export type ProviderOption = {
  id: string;
  shortName: string;
  legalName: string;
  formerNames: string[];
  role: "supplier" | "network";
  serviceTypes: string[];
  prefixes: string[];
  website: string | null;
};
export type ContactOption = { id: string; name: string; role: string };
export type ServiceCatalog = {
  types: CatalogOption[];
  settlements: CatalogOption[];
  frequencies: CatalogOption[];
  dues: CatalogOption[];
  tariffs: CatalogOption[];
  identifiers: CatalogOption[];
};
export type ServiceDraft = Omit<ServiceInput, "propertyId" | "provider"> & { provider: ServiceInput["provider"] };

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
const groupOf = (types: CatalogOption[], key: string) => (types.find((t) => t.key === key)?.meta.group === "utility" ? "utility" : "other");

/** Providers of a type whose coverage includes the postcode (empty coverage = everywhere). */
const covers = (p: ProviderOption, postalCode: string) => p.prefixes.length === 0 || p.prefixes.some((x) => postalCode.startsWith(x));

/**
 * Provider field (canvas "Új közmű – szolgáltató"): suggestions for this address, the curated list (also by former
 * names, e.g. Vodafone → One), the account's contacts, a new contact, or the typed name as it is.
 */
function ProviderField({
  id,
  typeKey,
  utility,
  value,
  onChange,
  providers,
  contacts,
  postalCode,
  error,
}: {
  id: string;
  typeKey: string;
  utility: boolean;
  value: ServiceInput["provider"];
  onChange: (v: ServiceInput["provider"]) => void;
  providers: ProviderOption[];
  contacts: ContactOption[];
  postalCode: string;
  error?: string;
}) {
  const t = useTranslations("properties.services.form");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = `${id}-list`;
  const input = useRef<HTMLInputElement>(null);
  const ofType = providers.filter((p) => p.role === "supplier" && p.serviceTypes.includes(typeKey));
  const query = fold(q);
  const match = (p: ProviderOption) => !query || [p.shortName, p.legalName, ...p.formerNames].some((n) => fold(n).includes(query));
  const suggested = ofType.filter((p) => covers(p, postalCode) && match(p));
  const others = providers.filter((p) => p.role === "supplier" && !p.serviceTypes.includes(typeKey) && query && match(p)).slice(0, 4);
  const people = contacts.filter((c) => query && fold(`${c.name} ${c.role}`).includes(query)).slice(0, 5);
  type Item = { key: string; pick: NonNullable<ServiceInput["provider"]>; title: string; sub?: string; icon: "bolt" | "user" | "plus" | "edit" };
  const items: { group: string; list: Item[] }[] = [
    {
      group: t("suggested"),
      list: suggested.map((p) => ({
        key: p.id,
        pick: { kind: "provider" as const, id: p.id, name: p.shortName },
        title: p.legalName,
        sub: [p.formerNames.length ? t("formerly", { names: p.formerNames.join(", ") }) : null, p.website?.replace(/^https:\/\/(www\.)?/, "")]
          .filter(Boolean)
          .join(" · "),
        icon: "bolt" as const,
      })),
    },
    {
      group: t("providers"),
      list: others.map((p) => ({
        key: p.id,
        pick: { kind: "provider" as const, id: p.id, name: p.shortName },
        title: p.legalName,
        sub: p.formerNames.length ? t("formerly", { names: p.formerNames.join(", ") }) : undefined,
        icon: "bolt" as const,
      })),
    },
    {
      group: t("fromContacts"),
      list: people.map((c) => ({ key: c.id, pick: { kind: "contact" as const, id: c.id, name: c.name }, title: c.name, sub: c.role, icon: "user" as const })),
    },
  ].filter((g) => g.list.length);
  const extra: Item[] = q.trim()
    ? [
        ...(!utility
          ? [{ key: "__new", pick: { kind: "newContact" as const, name: q.trim() }, title: t("newContact", { name: q.trim() }), icon: "plus" as const }]
          : []),
        { key: "__name", pick: { kind: "name" as const, name: q.trim() }, title: t("ownName", { name: q.trim() }), icon: "edit" as const },
      ]
    : [];
  const flat = [...items.flatMap((g) => g.list), ...extra];
  const choose = (it: Item) => {
    onChange(it.pick);
    setQ("");
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      choose(flat[active]);
    } else if (e.key === "Escape") setOpen(false);
  };

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">{t("provider")}</span>
        <div className="flex min-h-11 items-center gap-3 rounded-lg border border-field bg-surface py-1.5 pr-1.5 pl-3">
          <Icon
            name={value.kind === "provider" ? "bolt" : value.kind === "name" ? "edit" : "user"}
            size={16}
            strokeWidth={1.75}
            className="flex-none text-muted"
          />
          <span className="min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]">{value.name}</span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              requestAnimationFrame(() => input.current?.focus());
            }}
            aria-label={t("clearProvider")}
            className="flex size-11 flex-none items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink sm:size-8"
          >
            <Icon name="x" size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }
  let n = -1;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t("provider")}</Label>
      <div className="relative">
        <Icon name="search" size={17} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && flat[active] ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={q}
          placeholder={t("providerPlaceholder")}
          autoComplete="off"
          maxLength={120}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          className={`${INPUT_CLASS} pl-10`}
        />
        {open && flat.length > 0 && (
          <div
            id={listId}
            role="listbox"
            aria-label={t("provider")}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-80 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgb(12_31_25/0.14)]"
          >
            {items.map((g) => (
              <div key={g.group} role="group" aria-label={g.group}>
                <p className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted">{g.group}</p>
                {g.list.map((it) => {
                  n += 1;
                  const i = n;
                  return (
                    <div
                      key={it.key}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(it)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 ${i === active ? "bg-mist" : ""}`}
                    >
                      <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-md bg-mist text-brand">
                        <Icon name={it.icon} size={14} strokeWidth={1.9} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-semibold [overflow-wrap:anywhere]">{it.title}</span>
                        {it.sub && <span className="text-[12.5px] text-muted [overflow-wrap:anywhere]">{it.sub}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            {extra.length > 0 && <div className="my-1 h-px bg-line" />}
            {extra.map((it) => {
              n += 1;
              const i = n;
              return (
                <div
                  key={it.key}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(it)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-[13.5px] font-medium ${it.key === "__new" ? "text-brand" : ""} ${i === active ? "bg-mist" : ""}`}
                >
                  <Icon name={it.icon} size={15} strokeWidth={2} className="flex-none" />
                  <span className="[overflow-wrap:anywhere]">{it.title}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: CatalogOption[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT_CLASS} appearance-auto`}>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Add or edit a service (canvas "Új közmű", "Új szolgáltatás"): type, provider, network (utilities), identifiers, meters,
 * readings and settlement in a side panel; saved in one go.
 */
export function ServiceForm({
  open,
  onClose,
  propertyId,
  group,
  initial,
  name,
  catalog,
  providers,
  contacts,
  postalCode,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  group: "utility" | "other";
  initial: (ServiceDraft & { serviceId?: string }) | null;
  name: string;
  catalog: ServiceCatalog;
  providers: ProviderOption[];
  contacts: ContactOption[];
  postalCode: string;
}) {
  const t = useTranslations("properties.services");
  const f = useTranslations("properties.services.form");
  const id = useId();
  const router = useRouter();
  const types = offered(catalog.types).filter((x) => groupOf(catalog.types, x.key) === group || x.key === initial?.typeKey);
  const networks = (typeKey: string) => providers.filter((p) => p.role === "network" && p.serviceTypes.includes(typeKey));
  const autoNetwork = (typeKey: string) => networks(typeKey).find((p) => p.prefixes.length > 0 && covers(p, postalCode))?.id ?? "";
  const [v, setV] = useState<ServiceDraft>(
    () =>
      initial ?? {
        typeKey: types[0]?.key ?? "",
        customLabel: "",
        provider: null,
        networkProviderId: autoNetwork(types[0]?.key ?? ""),
        settlementKey: "tenant_direct",
        fee: "",
        readingRequired: group === "utility",
        readingFrequency: "monthly",
        readingDue: "d5",
        identifiers: [],
        meters: [],
      },
  );
  const [state, setState] = useState<ServiceState>({ status: "idle" });
  const [pending, start] = useTransition();
  const problems = state.status === "error" ? (state.fields ?? {}) : {};
  const set =
    <K extends keyof ServiceDraft>(k: K) =>
    (x: ServiceDraft[K]) =>
      setV((s) => ({ ...s, [k]: x }));
  const type = catalog.types.find((x) => x.key === v.typeKey);
  const utility = group === "utility";
  const hasTariffs = type?.meta.tariffs === true;
  const settlements = offered(catalog.settlements).filter((s) => Array.isArray(s.meta.groups) && (s.meta.groups as string[]).includes(group));
  const idSuggestions = useMemo(
    () => offered(catalog.identifiers).filter((s) => Array.isArray(s.meta.groups) && (s.meta.groups as string[]).includes(group)),
    [catalog.identifiers, group],
  );
  const nets = networks(v.typeKey);
  const autoNet = autoNetwork(v.typeKey);
  const errorCount = Object.keys(problems).length;

  const changeType = (key: string) =>
    setV((s) => ({
      ...s,
      typeKey: key,
      provider: s.provider?.kind === "provider" ? null : s.provider,
      networkProviderId: autoNetwork(key),
      customLabel: asksLabel(catalog.types, key) ? s.customLabel : "",
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const next = await saveService({ propertyId, serviceId: initial?.serviceId, ...v });
      setState(next);
      if (next.status === "saved") {
        toast(t("saved"));
        onClose();
        router.refresh();
      }
    });
  };
  const formId = `${id}-form`;
  const title = initial?.serviceId ? f("editTitle", { name }) : f(utility ? "newUtility" : "newOther");

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={f("close")}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>
            {f("cancel")}
          </button>
          <Button pending={pending} formId={formId}>
            {f("save")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
        {state.status === "error" && state.error && <Notice kind="error">{t(`errors.${state.error}`)}</Notice>}
        {errorCount > 1 && <Notice kind="error">{t("errors.summary", { count: errorCount })}</Notice>}
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">{f("type")}</legend>
          <div className={`grid gap-2 ${utility ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3 sm:grid-cols-4"}`}>
            {types.map((o) => (
              <label
                key={o.key}
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-field bg-surface px-1.5 py-2 text-center text-[13px] leading-4 font-medium hover:border-ink has-checked:border-ink has-checked:bg-mist/60 has-focus-visible:outline-3 has-focus-visible:outline-brand"
              >
                <input type="radio" name="type" value={o.key} checked={v.typeKey === o.key} onChange={() => changeType(o.key)} className="sr-only" />
                <Icon name={isIconName(o.icon) ? o.icon : "grid"} size={17} strokeWidth={1.75} className="text-ink-soft" />
                <span className="[overflow-wrap:anywhere]">{o.short}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {asksLabel(catalog.types, v.typeKey) && (
          <div className="flex flex-col gap-1.5 sm:max-w-[300px]">
            <Label htmlFor={`${id}-label`}>{f("customLabel")}</Label>
            <input
              id={`${id}-label`}
              value={v.customLabel}
              onChange={(e) => set("customLabel")(e.target.value)}
              placeholder={f("customPlaceholder")}
              maxLength={60}
              aria-invalid={problems.customLabel ? true : undefined}
              className={INPUT_CLASS}
            />
            {problems.customLabel && <FieldError id={`${id}-label-error`} message={t("errors.customLabel")} />}
          </div>
        )}
        <ProviderField
          id={`${id}-provider`}
          typeKey={v.typeKey}
          utility={utility}
          value={v.provider}
          onChange={set("provider")}
          providers={providers}
          contacts={contacts}
          postalCode={postalCode}
          error={problems.provider ? t("errors.provider") : undefined}
        />
        {utility && nets.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-paper px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${id}-net`}>{t("network")}</Label>
              {autoNet && v.networkProviderId === autoNet && <span className="text-[12px] text-muted">{f("networkFromAddress")}</span>}
            </div>
            <select
              id={`${id}-net`}
              value={v.networkProviderId}
              onChange={(e) => set("networkProviderId")(e.target.value)}
              className={`${INPUT_CLASS} appearance-auto`}
            >
              <option value="">{f("networkChoose")}</option>
              {nets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.legalName}
                </option>
              ))}
            </select>
          </div>
        )}

        <section aria-labelledby={`${id}-ids`} className="flex flex-col gap-2.5 border-t border-paper pt-4">
          <h3 id={`${id}-ids`} className="text-[15px] font-semibold">
            {f("identifiers")}
          </h3>
          <datalist id={`${id}-id-suggestions`}>
            {idSuggestions.map((s) => (
              <option key={s.key} value={s.label} />
            ))}
          </datalist>
          {v.identifiers.map((it, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1 gap-y-2 rounded-lg border border-line p-2">
              <input
                aria-label={f("idLabel")}
                list={`${id}-id-suggestions`}
                value={it.label}
                placeholder={f("idLabel")}
                maxLength={60}
                onChange={(e) => set("identifiers")(v.identifiers.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                aria-label={f("removeIdentifier")}
                onClick={() => set("identifiers")(v.identifiers.filter((_, j) => j !== i))}
                className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink sm:size-10"
              >
                <Icon name="x" size={16} strokeWidth={2} />
              </button>
              <input
                aria-label={f("idValue")}
                value={it.value}
                placeholder={f("idValue")}
                maxLength={120}
                spellCheck={false}
                onChange={(e) => set("identifiers")(v.identifiers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                className={`${INPUT_CLASS} col-span-2 font-mono text-[13px]`}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("identifiers")([...v.identifiers, { label: idSuggestions[v.identifiers.length]?.label ?? "", value: "" }])}
            className="inline-flex min-h-11 items-center gap-1.5 self-start text-[13.5px] font-semibold text-brand hover:underline sm:min-h-8"
          >
            <Icon name="plus" size={15} strokeWidth={2.25} />
            {f("addIdentifier")}
          </button>
        </section>

        {utility && (
          <section aria-labelledby={`${id}-meters`} className="flex flex-col gap-2.5 border-t border-paper pt-4">
            <h3 id={`${id}-meters`} className="text-[15px] font-semibold">
              {f("meters")}
            </h3>
            {v.meters.map((m, i) => {
              const upd = (patch: Partial<typeof m>) => set("meters")(v.meters.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={m.id ?? `new-${i}`} className="flex flex-col gap-2.5 rounded-lg border border-line p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Label htmlFor={`${id}-m${i}-name`}>{f("meterName")}</Label>
                      <input
                        id={`${id}-m${i}-name`}
                        value={m.name}
                        placeholder={f("meterNamePlaceholder")}
                        maxLength={60}
                        onChange={(e) => upd({ name: e.target.value })}
                        aria-invalid={problems[`meter.${i}`] ? true : undefined}
                        className={INPUT_CLASS}
                      />
                      {problems[`meter.${i}`] && <FieldError id={`${id}-m${i}-error`} message={t("errors.meterName")} />}
                    </div>
                    <button
                      type="button"
                      aria-label={f("removeMeter")}
                      onClick={() => set("meters")(v.meters.filter((_, j) => j !== i))}
                      className="mt-6 flex size-11 flex-none items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink sm:size-10"
                    >
                      <Icon name="trash" size={16} strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className={`grid gap-2.5 ${hasTariffs ? "sm:grid-cols-2" : ""}`}>
                    {hasTariffs && (
                      <Select
                        id={`${id}-m${i}-tariff`}
                        label={f("tariff")}
                        value={m.tariffKey || "standard"}
                        onChange={(x) => upd({ tariffKey: x })}
                        options={offered(catalog.tariffs)}
                      />
                    )}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`${id}-m${i}-serial`}>
                        {f("serial")} <Optional>{f("optional")}</Optional>
                      </Label>
                      <input
                        id={`${id}-m${i}-serial`}
                        value={m.serial}
                        maxLength={40}
                        spellCheck={false}
                        onChange={(e) => upd({ serial: e.target.value })}
                        className={`${INPUT_CLASS} font-mono text-[13px]`}
                      />
                    </div>
                  </div>
                  <div className={`grid gap-2.5 ${hasTariffs ? "sm:grid-cols-2" : ""}`}>
                    {hasTariffs && (
                      <fieldset>
                        <legend className="mb-1.5 text-[13px] font-medium">{f("registers")}</legend>
                        <div className="flex rounded-lg bg-paper p-0.5">
                          {([1, 2] as const).map((r) => (
                            <label
                              key={r}
                              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-center text-[13px] leading-4 font-medium text-muted has-checked:bg-surface has-checked:text-ink has-checked:shadow-[0_1px_2px_rgb(12_31_25/0.12)] has-focus-visible:outline-3 has-focus-visible:outline-brand sm:min-h-9"
                            >
                              <input
                                type="radio"
                                name={`${id}-m${i}-reg`}
                                checked={m.registers === r}
                                onChange={() => upd({ registers: r })}
                                className="sr-only"
                              />
                              {f(r === 1 ? "registersOne" : "registersTwo")}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`${id}-m${i}-loc`}>
                        {f("location")} <Optional>{f("optional")}</Optional>
                      </Label>
                      <input
                        id={`${id}-m${i}-loc`}
                        value={m.location}
                        placeholder={f("locationPlaceholder")}
                        maxLength={80}
                        onChange={(e) => upd({ location: e.target.value })}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() =>
                set("meters")([
                  ...v.meters,
                  { name: v.meters.length ? "" : (type?.label ?? ""), tariffKey: "standard", serial: "", registers: 1, location: "" },
                ])
              }
              className="inline-flex min-h-11 items-center gap-1.5 self-start text-[13.5px] font-semibold text-brand hover:underline sm:min-h-8"
            >
              <Icon name="plus" size={15} strokeWidth={2.25} />
              {f("addMeter")}
            </button>
          </section>
        )}

        {utility && (
          <section aria-labelledby={`${id}-reading`} className="flex flex-col gap-3 border-t border-paper pt-4">
            <h3 id={`${id}-reading`} className="text-[15px] font-semibold">
              {f("readingTitle")}
            </h3>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm">
              {f("readingSwitch")}
              <input
                type="checkbox"
                role="switch"
                checked={v.readingRequired}
                onChange={(e) => set("readingRequired")(e.target.checked)}
                className="relative h-6 w-11 flex-none cursor-pointer appearance-none rounded-full bg-field transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-brand checked:before:translate-x-5 focus-visible:outline-3 focus-visible:outline-brand motion-reduce:transition-none"
              />
            </label>
            {v.readingRequired && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  id={`${id}-freq`}
                  label={f("frequency")}
                  value={v.readingFrequency || "monthly"}
                  onChange={set("readingFrequency")}
                  options={offered(catalog.frequencies)}
                />
                <Select id={`${id}-due`} label={f("due")} value={v.readingDue || "d5"} onChange={set("readingDue")} options={offered(catalog.dues)} />
              </div>
            )}
          </section>
        )}

        <fieldset className="flex flex-col gap-2 border-t border-paper pt-4">
          <legend className="sr-only">{f("settlement")}</legend>
          <p aria-hidden="true" className="mb-1 text-[15px] font-semibold">
            {f("settlement")}
          </p>
          {settlements.map((s) => (
            <label
              key={s.key}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-field px-3.5 py-2.5 text-sm font-medium has-checked:border-ink has-checked:bg-mist/40 has-focus-visible:outline-3 has-focus-visible:outline-brand"
            >
              <input
                type="radio"
                name="settlement"
                checked={v.settlementKey === s.key}
                onChange={() => set("settlementKey")(s.key)}
                className="size-[18px] flex-none accent-ink"
              />
              <span className="[overflow-wrap:anywhere]">{s.label}</span>
            </label>
          ))}
        </fieldset>
        {(!utility || v.settlementKey === "flat_rate") && (
          <div className="flex flex-col gap-1.5 sm:max-w-[260px]">
            <Label htmlFor={`${id}-fee`}>
              {f(utility ? "flatFee" : "fee")} {!utility && <Optional>{f("optional")}</Optional>}
            </Label>
            <div className="relative">
              <input
                id={`${id}-fee`}
                inputMode="numeric"
                value={v.fee}
                onChange={(e) => set("fee")(e.target.value)}
                maxLength={11}
                aria-invalid={problems.fee ? true : undefined}
                className={`${INPUT_CLASS} pr-20 tabular-nums`}
              />
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted">
                {f("perMonthUnit")}
              </span>
            </div>
            {problems.fee && <FieldError id={`${id}-fee-error`} message={t("errors.fee")} />}
          </div>
        )}
      </form>
    </Drawer>
  );
}
