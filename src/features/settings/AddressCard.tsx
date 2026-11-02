"use client";

import { useActionState, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, FieldError, INPUT_CLASS, Label, Notice, Optional } from "@/components/ui/form";
import { COUNTRIES } from "@/config/countries";
import { AddressSearch } from "@/features/address-search/AddressSearch";
import type { FoundAddress } from "@/features/address-search/places";
import { pickedStreet } from "@/features/address-search/street";
import { saveAddress, type AddressState, type PersonalAddress } from "./actions";

type Kind = "home" | "mailing";

/** "1137 Budapest, Pozsonyi út 12. 3. em. 8." – plus the country when it is not Hungary. */
function oneLine(a: PersonalAddress, country: (code: string) => string) {
  const line = `${a.postal_code} ${a.city}, ${a.street}${a.unit ? ` ${a.unit}` : ""}`;
  return a.country === "HU" ? line : `${line}, ${country(a.country)}`;
}

/**
 * "Címek" on the profile (canvas "Profil – lakcím és levelezési cím"): the home and the mailing address, each changed
 * in its own dialog. The mailing address is "same as the home address" until the person gives another one.
 */
export function AddressCard({ home, mailing }: { home: PersonalAddress | null; mailing: PersonalAddress | null }) {
  const t = useTranslations("settings.addresses");
  const locale = useLocale();
  const headingId = useId();
  const [editing, setEditing] = useState<Kind | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const country = (code: string) => names.of(code) ?? code;
  const close = () => {
    setEditing(null);
    requestAnimationFrame(() => opener.current?.focus());
  };

  const rows: { kind: Kind; icon: "home" | "mail"; label: string; value: string | null }[] = [
    { kind: "home", icon: "home", label: t("home"), value: home ? oneLine(home, country) : null },
    { kind: "mailing", icon: "mail", label: t("mailing"), value: mailing ? oneLine(mailing, country) : home ? t("sameAsHome") : null },
  ];

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-line bg-surface">
      <h2 id={headingId} className="px-5 pt-5 pb-3 text-[15px] font-semibold sm:px-6">
        {t("title")}
      </h2>
      <ul>
        {rows.map((row) => (
          <li key={row.kind} className="flex items-center gap-3 border-t border-line px-5 py-3.5 sm:px-6">
            <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-mist text-brand">
              <Icon name={row.icon} size={18} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[12.5px] text-muted">{row.label}</span>
              <span className={`text-sm [overflow-wrap:break-word] ${row.value ? "font-medium" : "text-muted"}`}>{row.value ?? t("notSet")}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setEditing(row.kind);
              }}
              aria-label={`${row.label}: ${row.value ? t("edit") : t("add")}`}
              className="inline-flex h-11 flex-none items-center rounded-lg border border-field bg-surface px-3.5 text-[13px] font-medium hover:border-ink sm:h-9"
            >
              {row.value ? t("edit") : t("add")}
            </button>
          </li>
        ))}
      </ul>
      {editing && <AddressDialog kind={editing} current={editing === "home" ? home : mailing} hasHome={Boolean(home)} onClose={close} country={country} />}
    </section>
  );
}

function AddressDialog({ kind, current, hasHome, onClose, country }: { kind: Kind; current: PersonalAddress | null; hasHome: boolean; onClose: () => void; country: (code: string) => string }) {
  const t = useTranslations("settings.addresses");
  const id = useId();
  const [same, setSame] = useState(kind === "mailing" && hasHome && !current);
  const [code, setCode] = useState(current?.country ?? "HU");
  // Canvas "Lakcím – keresés": the Google search fills the parts, which stay editable; a saved address shows them at once.
  const [parts, setParts] = useState({ postal_code: current?.postal_code ?? "", city: current?.city ?? "", street: current?.street ?? "", unit: current?.unit ?? "" });
  const [showParts, setShowParts] = useState(Boolean(current));
  const refs = useRef<Partial<Record<keyof typeof parts, HTMLInputElement | null>>>({});
  const reveal = (focus: keyof typeof parts) => {
    setShowParts(true);
    requestAnimationFrame(() => refs.current[focus]?.focus());
  };
  const onPick = (a: FoundAddress) => {
    setParts((p) => ({ ...p, postal_code: a.postalCode, city: a.city, street: pickedStreet(a, code) }));
    reveal(a.postalCode && a.city && a.houseNumber ? "unit" : a.postalCode ? "street" : "postal_code");
  };
  const [state, action, pending] = useActionState<AddressState, FormData>(async (prev, form) => {
    const next = await saveAddress(prev, form);
    if (next.status === "saved") {
      toast(next.removed ? t("removed") : t("saved"));
      onClose();
    }
    return next;
  }, { status: "idle" });
  const options = useMemo(() => {
    const [hu, ...rest] = COUNTRIES;
    return [hu, ...[...rest].sort((a, b) => country(a).localeCompare(country(b)))];
  }, [country]);
  const err = (k: "postal_code" | "city" | "street") => {
    const e = state.status === "error" ? state.fields?.[k] : undefined;
    return e ? t(e === "postalCode" ? "errors.postalCode" : "errors.required") : undefined;
  };
  const input = (name: "postal_code" | "city" | "street" | "unit", label: string, auto: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => {
    const e = name === "unit" ? undefined : err(name);
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={`${id}-${name}`}>
          {label}
          {name === "unit" && <Optional>{t("optional")}</Optional>}
        </Label>
        <input
          ref={(el) => {
            refs.current[name] = el;
          }}
          id={`${id}-${name}`}
          name={name}
          value={parts[name]}
          onChange={(ev) => setParts((p) => ({ ...p, [name]: ev.target.value }))}
          autoComplete={`section-${kind} ${auto}`}
          aria-invalid={e ? true : undefined}
          aria-describedby={e ? `${id}-${name}-error` : undefined}
          className={INPUT_CLASS}
          {...extra}
        />
        {e && <FieldError id={`${id}-${name}-error`} message={e} />}
      </div>
    );
  };

  return (
    <Dialog open onClose={onClose} title={kind === "home" ? t("home") : t("mailing")} closeLabel={t("close")}>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="kind" value={kind} />
        {kind === "mailing" && hasHome && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm sm:min-h-6">
            <input type="checkbox" name="sameAsHome" checked={same} onChange={(e) => setSame(e.target.checked)} className="size-[18px] flex-none accent-ink" />
            {t("sameAsHome")}
          </label>
        )}
        {!same && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-country`}>{t("country")}</Label>
              <select id={`${id}-country`} name="country" value={code} onChange={(e) => setCode(e.target.value)} autoComplete={`section-${kind} country`} className={`${INPUT_CLASS} appearance-auto`}>
                {options.map((c) => (
                  <option key={c} value={c}>
                    {country(c)}
                  </option>
                ))}
              </select>
            </div>
            <AddressSearch key={code} country={code} label={t("search")} keepPicked onPick={onPick} onManual={() => reveal("postal_code")} onUnavailable={() => setShowParts(true)} />
            {(showParts || state.status === "error") && (
              <>
                <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
                  {input("postal_code", t("postalCode"), "postal-code", { inputMode: code === "HU" ? "numeric" : "text", maxLength: code === "HU" ? 4 : 10 })}
                  {input("city", t("city"), "address-level2", { maxLength: 100 })}
                </div>
                {input("street", t("street"), "address-line1", { maxLength: 200 })}
                {input("unit", t("unit"), "address-line2", { maxLength: 50 })}
              </>
            )}
          </>
        )}
        {state.status === "error" && !state.fields && <Notice kind="error">{t("errors.generic")}</Notice>}
        <DialogActions>
          {current && (
            <button type="submit" name="intent" value="remove" formNoValidate className="mr-auto inline-flex h-11 items-center justify-center rounded-lg px-1 text-sm font-medium text-danger-ink hover:underline sm:h-10">
              {t("remove")}
            </button>
          )}
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
            {t("cancel")}
          </button>
          <Button pending={pending} fit>
            {t("save")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
