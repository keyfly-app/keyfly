"use client";

import { useCallback, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { TextField } from "@/components/ui/form";
import { AddressSearch } from "@/features/address-search/AddressSearch";
import type { FoundAddress } from "@/features/address-search/places";
import { FloorInput } from "@/features/lease-requests/FloorInput";
import { STREET_TYPES, cityLine, withDot } from "@/lib/address";

export type AddressValues = {
  postalCode: string;
  city: string;
  streetName: string;
  streetType: string;
  houseNumber: string;
  building: string;
  staircase: string;
  floor: string;
  door: string;
};
export const EMPTY_ADDRESS: AddressValues = {
  postalCode: "",
  city: "",
  streetName: "",
  streetType: "",
  houseNumber: "",
  building: "",
  staircase: "",
  floor: "",
  door: "",
};
const STREET_KEYS = ["postalCode", "city", "streetName", "streetType", "houseNumber"] as const;

/**
 * The property's address (canvas "Új ingatlan – címkereső"): search first (Google, through our server), the street
 * parts by hand when the person asks or the search is unavailable, and the unit within the building below it.
 * Hidden inputs carry every part, so the surrounding <form> posts them. `initial="picked"`: an existing address.
 */
export function AddressFields({
  values,
  onChange,
  errors,
  initial = "search",
}: {
  values: AddressValues;
  onChange: (next: AddressValues) => void;
  errors: Partial<Record<keyof AddressValues, string>>;
  initial?: "search" | "picked" | "manual";
}) {
  const t = useTranslations("leaseRequest");
  const s = useTranslations("leaseRequest.addressSearch");
  const p = useTranslations("properties.new");
  const id = useId();
  const [mode, setMode] = useState(initial);
  const set = (key: keyof AddressValues) => (value: string) => onChange({ ...values, [key]: value });
  const toManual = useCallback(() => setMode("manual"), []);
  const pick = (found: FoundAddress) => {
    const next = {
      ...values,
      postalCode: found.postalCode,
      city: found.city,
      streetName: found.streetName,
      streetType: found.streetType,
      houseNumber: found.houseNumber,
    };
    onChange(next);
    // Anything Google left out (e.g. no house number) is completed by hand.
    setMode(STREET_KEYS.every((k) => next[k].trim()) ? "picked" : "manual");
  };
  const streetError = STREET_KEYS.some((k) => errors[k]);

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(values).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {mode === "search" && (
        <AddressSearch label={p("address")} onPick={pick} onManual={toManual} onUnavailable={toManual} error={streetError ? s("pickRequired") : undefined} />
      )}
      {mode === "picked" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{p("address")}</span>
          <div className="flex items-center gap-3 rounded-lg border border-field bg-surface py-2 pr-1.5 pl-3">
            <Icon name="pin" size={18} strokeWidth={1.75} className="flex-none text-muted" />
            <span className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere]">
              {`${values.streetName} ${values.streetType} ${withDot(values.houseNumber)}`.replace(/\s+/g, " ").trim()}, {cityLine(values)}
            </span>
            <button
              type="button"
              onClick={() => setMode("search")}
              className="inline-flex min-h-11 flex-none items-center rounded-md px-2.5 text-sm font-semibold text-brand hover:bg-paper sm:min-h-9"
            >
              {t("change")}
            </button>
          </div>
        </div>
      )}
      {mode === "manual" && (
        <>
          <button
            type="button"
            onClick={() => setMode("search")}
            className="-my-2 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-brand hover:underline"
          >
            <Icon name="search" size={16} strokeWidth={2} />
            {s("backToSearch")}
          </button>
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
            <TextField
              id={`${id}-pc`}
              label={t("address.postalCode")}
              value={values.postalCode}
              onChange={(e) => set("postalCode")(e.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={4}
              error={errors.postalCode}
            />
            <TextField
              id={`${id}-city`}
              label={t("address.city")}
              value={values.city}
              onChange={(e) => set("city")(e.target.value)}
              maxLength={100}
              error={errors.city}
            />
          </div>
          <TextField
            id={`${id}-street`}
            label={t("address.streetName")}
            value={values.streetName}
            onChange={(e) => set("streetName")(e.target.value)}
            maxLength={100}
            error={errors.streetName}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id={`${id}-type`}
              label={t("address.streetType")}
              value={values.streetType}
              onChange={(e) => set("streetType")(e.target.value)}
              list={`${id}-types`}
              maxLength={30}
              error={errors.streetType}
            />
            <TextField
              id={`${id}-no`}
              label={t("address.houseNumber")}
              value={values.houseNumber}
              onChange={(e) => set("houseNumber")(e.target.value)}
              maxLength={20}
              error={errors.houseNumber}
            />
          </div>
          <datalist id={`${id}-types`}>
            {STREET_TYPES.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </>
      )}
      <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <legend className="sr-only">{p("unit")}</legend>
        <TextField id={`${id}-bld`} label={t("address.building")} value={values.building} onChange={(e) => set("building")(e.target.value)} maxLength={20} />
        <TextField
          id={`${id}-stair`}
          label={t("address.staircase")}
          value={values.staircase}
          onChange={(e) => set("staircase")(e.target.value)}
          maxLength={20}
        />
        <FloorInput id={`${id}-floor`} value={values.floor} onChange={set("floor")} placeholder={p("floorPlaceholder")} />
        <TextField id={`${id}-door`} label={t("address.door")} value={values.door} onChange={(e) => set("door")(e.target.value)} maxLength={20} />
      </fieldset>
    </div>
  );
}
