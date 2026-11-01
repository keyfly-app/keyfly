"use client";

import { useActionState, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { Button, INPUT_CLASS, Label, Notice, TextField } from "@/components/ui/form";
import { InfoTip } from "@/components/ui/InfoTip";
import { isLocale } from "@/i18n/config";
import { FLOOR_NUMBERS, STREET_TYPES, fullAddress } from "@/lib/address";
import { date, money, number } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
import { createLeaseRequest, type RequestState } from "./actions";
import { DetailRows, LATEST_DATE, MoneyField, Segmented, StepBar } from "./ui";
import {
  ADDRESS_FIELDS,
  LANDLORD_FIELDS,
  TERM_FIELDS,
  clearError,
  hasErrors,
  parseAmount,
  parseFloor,
  validateAddress,
  validateLandlord,
  validateTerms,
  type Errors,
  type Values,
} from "./validate";

const STEPS = ["home", "lease", "landlord"] as const;
const LOW_FLOORS: Enums<"floor_type">[] = ["basement", "ground", "raised_ground", "mezzanine"];
const EMPTY: Values = {
  postalCode: "",
  city: "",
  streetName: "",
  streetType: "",
  houseNumber: "",
  building: "",
  staircase: "",
  floor: "",
  door: "",
  startDate: "",
  term: "fixed",
  endDate: "",
  monthlyRent: "",
  deposit: "",
  landlordEmail: "",
  landlordName: "",
};

/** The step a server-side error belongs to, so the form opens there. */
function stepOf(errors: Errors): number {
  const keys = Object.keys(errors);
  if (keys.some((k) => (ADDRESS_FIELDS as readonly string[]).includes(k))) return 0;
  if (keys.some((k) => (TERM_FIELDS as readonly string[]).includes(k))) return 1;
  if (keys.some((k) => (LANDLORD_FIELDS as readonly string[]).includes(k))) return 2;
  return 2;
}

/**
 * Steps 1–3 of "invite your landlord": the home's address, the lease terms the tenant knows, the landlord's email.
 * One form; every step is checked before moving on, and the server checks everything again.
 */
export function RequestWizard({ myEmail }: { myEmail: string }) {
  const t = useTranslations("leaseRequest");
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const id = useId();
  const top = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [state, action, pending] = useActionState<RequestState, FormData>(async (prev, form) => {
    const next = await createLeaseRequest(prev, form);
    if (next.status === "error" && next.fields && hasErrors(next.fields)) {
      setErrors(next.fields);
      setStep(stepOf(next.fields));
    }
    return next;
  }, { status: "idle" });

  const set = (key: string) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => clearError(e, key));
  };
  const err = (key: string) => (errors[key] ? t(`errors.${errors[key]}`) : undefined);
  const formatAmount = (key: string) => () => {
    const n = parseAmount(values[key]);
    if (n != null && !Number.isNaN(n)) set(key)(number(n, locale));
  };
  const go = (to: number) => {
    setStep(to);
    requestAnimationFrame(() => top.current?.focus());
  };
  const next = () => {
    const found = step === 0 ? validateAddress(values) : validateTerms(values);
    setErrors(found);
    if (!hasErrors(found)) go(step + 1);
  };
  const submitCheck = (e: React.FormEvent) => {
    const found = { ...validateAddress(values), ...validateTerms(values), ...validateLandlord(values, myEmail) };
    if (hasErrors(found)) {
      e.preventDefault();
      setErrors(found);
      setStep(stepOf(found));
    }
  };

  const { floorType, floorNumber } = parseFloor(values.floor);
  const address = fullAddress({
    postalCode: values.postalCode.trim(),
    city: values.city.trim(),
    streetName: values.streetName.trim(),
    streetType: values.streetType.trim(),
    houseNumber: values.houseNumber.trim(),
    building: values.building.trim(),
    staircase: values.staircase.trim(),
    floorType: floorType as Enums<"floor_type"> | null,
    floorNumber,
    door: values.door.trim(),
  });
  const rent = parseAmount(values.monthlyRent);

  return (
    <form action={action} onSubmit={submitCheck} noValidate className="flex flex-1 flex-col gap-4">
      {Object.entries(values).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {step > 0 && (
        <button type="button" onClick={() => go(step - 1)} className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start px-2 text-sm font-semibold">
          <Icon name="back" size={18} />
          {t("back")}
        </button>
      )}
      <StepBar
        step={step + 1}
        total={STEPS.length}
        name={t(`steps.${STEPS[step]}`)}
        label={t("progressLabel")}
        count={t("stepCount", { step: step + 1, total: STEPS.length })}
      />
      <div ref={top} tabIndex={-1} className="flex flex-col gap-1.5 outline-none">
        <h1 className="font-display text-[26px] leading-tight font-semibold">{t(step === 0 ? "address.title" : step === 1 ? "terms.title" : "landlord.title")}</h1>
        {step < 2 && <p className="text-[15px] text-muted">{t(step === 0 ? "address.lead" : "terms.lead")}</p>}
      </div>

      {step === 0 && (
        <>
          <div className="grid grid-cols-[7rem_1fr] gap-2.5">
            <TextField id={`${id}-pc`} label={t("address.postalCode")} value={values.postalCode} onChange={(e) => set("postalCode")(e.target.value)}
              inputMode="numeric" autoComplete="postal-code" maxLength={4} error={err("postalCode")} />
            <TextField id={`${id}-city`} label={t("address.city")} value={values.city} onChange={(e) => set("city")(e.target.value)}
              autoComplete="address-level2" maxLength={100} error={err("city")} />
          </div>
          <TextField id={`${id}-street`} label={t("address.streetName")} value={values.streetName} onChange={(e) => set("streetName")(e.target.value)}
            maxLength={100} error={err("streetName")} />
          <div className="grid grid-cols-2 gap-2.5">
            <TextField id={`${id}-type`} label={t("address.streetType")} value={values.streetType} onChange={(e) => set("streetType")(e.target.value)}
              list={`${id}-types`} maxLength={30} error={err("streetType")} />
            <TextField id={`${id}-no`} label={t("address.houseNumber")} value={values.houseNumber} onChange={(e) => set("houseNumber")(e.target.value)}
              maxLength={20} error={err("houseNumber")} />
          </div>
          <datalist id={`${id}-types`}>
            {STREET_TYPES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="grid grid-cols-2 gap-2.5">
            <TextField id={`${id}-bld`} label={t("address.building")} value={values.building} onChange={(e) => set("building")(e.target.value)} maxLength={20} />
            <TextField id={`${id}-stair`} label={t("address.staircase")} value={values.staircase} onChange={(e) => set("staircase")(e.target.value)} maxLength={20} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-floor`}>{t("address.floor")}</Label>
              <select id={`${id}-floor`} value={values.floor} onChange={(e) => set("floor")(e.target.value)} className={`${INPUT_CLASS} appearance-auto`}>
                <option value="">{t("address.floorNone")}</option>
                {LOW_FLOORS.map((f) => (
                  <option key={f} value={f}>{t(`address.floors.${f}`)}</option>
                ))}
                {FLOOR_NUMBERS.map((n) => (
                  <option key={n} value={`numbered:${n}`}>{t("address.floorNumbered", { number: n })}</option>
                ))}
                <option value="attic">{t("address.floors.attic")}</option>
              </select>
            </div>
            <TextField id={`${id}-door`} label={t("address.door")} value={values.door} onChange={(e) => set("door")(e.target.value)} maxLength={20} />
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <TextField id={`${id}-start`} type="date" max={LATEST_DATE} label={t("terms.start")} value={values.startDate} onChange={(e) => set("startDate")(e.target.value)} error={err("startDate")} />
          <Segmented
            name="termSwitch"
            legend={t("terms.duration")}
            value={values.term === "open" ? "open" : "fixed"}
            onChange={set("term")}
            options={[
              { value: "fixed", label: t("terms.fixed") },
              { value: "open", label: t("terms.openEnded") },
            ]}
          />
          {values.term !== "open" && (
            <TextField id={`${id}-end`} type="date" max={LATEST_DATE} label={t("terms.end")} value={values.endDate} min={values.startDate || undefined}
              onChange={(e) => set("endDate")(e.target.value)} error={err("endDate")} />
          )}
          <MoneyField id={`${id}-rent`} label={t("terms.rent")} value={values.monthlyRent} currency={t("terms.currency")}
            onChange={set("monthlyRent")} onBlur={formatAmount("monthlyRent")} error={err("monthlyRent")} />
          <MoneyField id={`${id}-deposit`} label={t("terms.deposit")} value={values.deposit} currency={t("terms.currency")}
            onChange={set("deposit")} onBlur={formatAmount("deposit")} error={err("deposit")} tip={<InfoTip text={t("terms.depositTip")} />} />
        </>
      )}

      {step === 2 && (
        <>
          <TextField id={`${id}-email`} type="email" label={t("landlord.email")} value={values.landlordEmail} onChange={(e) => set("landlordEmail")(e.target.value)}
            autoComplete="off" maxLength={254} error={err("landlordEmail")} />
          <TextField id={`${id}-name`} label={t("landlord.name")} value={values.landlordName} onChange={(e) => set("landlordName")(e.target.value)} maxLength={200} />
          <section aria-labelledby={`${id}-summary`} className="flex flex-col gap-2">
            <h2 id={`${id}-summary`} className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{t("landlord.summary")}</h2>
            <DetailRows
              rows={[
                [t("rows.property"), address],
                [t("rows.rent"), money(rent != null && !Number.isNaN(rent) ? rent : null, locale)],
                [t("rows.start"), date(values.startDate || null, locale)],
                [t("rows.end"), values.term === "open" ? t("terms.openEnded") : date(values.endDate || null, locale)],
              ]}
            />
          </section>
        </>
      )}

      {state.status === "error" && state.error && <Notice kind="error">{t(`errors.${state.error}`)}</Notice>}
      <div className="mt-auto flex flex-col gap-2.5 pt-4">
        {step < 2 ? (
          <button type="button" onClick={next} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand px-5.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-dark">
            {t("next")}
          </button>
        ) : (
          <>
            <Button pending={pending}>{pending ? t("landlord.submitting") : t("landlord.submit")}</Button>
            <p className="flex items-center justify-center gap-1.5 text-[13px] text-muted">
              {t("landlord.free")}
              <InfoTip text={t("landlord.freeTip")} align="end" />
            </p>
          </>
        )}
      </div>
    </form>
  );
}
