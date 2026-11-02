"use client";

import { useActionState, useCallback, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { Icon } from "@/components/Icon";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, FieldError, INPUT_CLASS, Label, Notice, TextField } from "@/components/ui/form";
import { Timeline } from "@/components/ui/Timeline";
import { isLocale } from "@/i18n/config";
import { AddressSearch } from "@/features/address-search/AddressSearch";
import type { FoundAddress } from "@/features/address-search/places";
import { PROPERTY_KIND_GROUPS } from "@/config/property-kinds";
import { STREET_TYPES, cityLine, fullAddress, streetLine, withDot, type AddressParts } from "@/lib/address";
import { date, money, number } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
import { createLeaseRequest, type RequestState } from "./actions";
import { FloorInput } from "./FloorInput";
import { KeyValues, LATEST_DATE, MoneyField, Segmented, TrustLines } from "./ui";
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

const STEPS = ["home", "lease", "landlord", "review"] as const;
const REVIEW = STEPS.length - 1;
const EMPTY: Values = {
  propertyKind: "",
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
const FIELDS_OF_STEP: readonly (readonly string[])[] = [["propertyKind", ...ADDRESS_FIELDS], TERM_FIELDS, LANDLORD_FIELDS];

/** The step a server-side error belongs to, so the form opens there. */
function stepOf(errors: Errors): number {
  const keys = Object.keys(errors);
  const at = FIELDS_OF_STEP.findIndex((fields) => keys.some((k) => fields.includes(k)));
  return at === -1 ? REVIEW : at;
}

/** A fixed term of `years` ends the day before the anniversary: 2026-12-01 + 1 → 2027-11-30. */
function endAfter(start: string, years: number): string {
  const [y, m, d] = start.split("-").map(Number);
  return new Date(Date.UTC(y + years, m - 1, d - 1)).toISOString().slice(0, 10);
}

/**
 * "Invite your landlord" as a focused flow (canvas "App v2.3"): home, terms, landlord, review.
 * One form; every step is checked before moving on, the review shows what the landlord gets, and the server checks
 * everything again. Desktop: a live summary rail; phones: a sticky action bar.
 */
export function RequestWizard({ myEmail, homeHref }: { myEmail: string; homeHref: string }) {
  const t = useTranslations("leaseRequest");
  const s = useTranslations("leaseRequest.addressSearch");
  const k = useTranslations("propertyKinds");
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const router = useRouter();
  const id = useId();
  const top = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [leaving, setLeaving] = useState(false);
  // Search first; manual entry when the person asks for it or the search is unavailable.
  const [addressMode, setAddressMode] = useState<"search" | "picked" | "manual">("search");
  const [state, action, pending] = useActionState<RequestState, FormData>(
    async (prev, data) => {
      const next = await createLeaseRequest(prev, data);
      if (next.status === "error" && next.fields && hasErrors(next.fields)) {
        setErrors(next.fields);
        const at = stepOf(next.fields);
        setStep(at);
        if (at === 0 && hasErrors(clearError(next.fields, "propertyKind"))) setAddressMode("manual"); // show the fields the server objected to
      }
      return next;
    },
    { status: "idle" },
  );

  const set = (key: string) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => clearError(e, key));
  };
  // Leaving the search for the fields: start them clean (an earlier "pick an address" error is not theirs).
  const useManual = useCallback(() => {
    setAddressMode("manual");
    setErrors((e) => ADDRESS_FIELDS.reduce<Errors>(clearError, e));
  }, []);
  const pickFound = (found: FoundAddress) => {
    const picked = { postalCode: found.postalCode, city: found.city, streetName: found.streetName, streetType: found.streetType, houseNumber: found.houseNumber };
    setValues((v) => ({ ...v, ...picked }));
    setErrors((e) => Object.keys(picked).reduce(clearError, e));
    // Anything Google left out (e.g. a street without a house number) is completed by hand.
    setAddressMode(hasErrors(clearError(validateAddress({ ...values, ...picked }), "propertyKind")) ? "manual" : "picked");
  };
  const err = (key: string) => (errors[key] ? t(`errors.${errors[key]}`) : undefined);
  const formatAmount = (key: string) => () => {
    const n = parseAmount(values[key]);
    if (n != null && !Number.isNaN(n)) set(key)(number(n, locale));
  };
  const focusTop = () => requestAnimationFrame(() => top.current?.focus());
  const focusFirstError = () =>
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
  const go = (to: number) => {
    setStep(to);
    focusTop();
  };
  const check = (at: number) =>
    at === 0 ? validateAddress(values) : at === 1 ? validateTerms(values) : at === 2 ? validateLandlord(values, myEmail) : {};
  const next = () => {
    const found = check(step);
    setErrors(found);
    if (step === 0 && addressMode === "picked" && hasErrors(clearError(found, "propertyKind"))) setAddressMode("manual");
    if (hasErrors(found)) return focusFirstError();
    go(step + 1);
  };
  const onSubmit = (e: React.FormEvent) => {
    // Enter in a field moves on; only the review step sends.
    if (step < REVIEW) {
      e.preventDefault();
      return next();
    }
    const found = { ...validateAddress(values), ...validateTerms(values), ...validateLandlord(values, myEmail) };
    if (hasErrors(found)) {
      e.preventDefault();
      setErrors(found);
      go(stepOf(found));
    }
  };
  const dirty = Object.entries(values).some(([k, v]) => v !== EMPTY[k]);
  const cancel = () => (dirty ? setLeaving(true) : router.push(homeHref));

  const { floorType, floorNumber } = parseFloor(values.floor);
  const parts: AddressParts = {
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
  };
  const amount = (key: string) => {
    const n = parseAmount(values[key]);
    return n != null && !Number.isNaN(n) ? n : null;
  };
  const period =
    values.term === "open" ? `${date(values.startDate, locale)} – ${t("terms.openEnded")}` : `${date(values.startDate, locale)} – ${date(values.endDate, locale)}`;
  const stepErrors = Object.keys(errors).filter((k) => (FIELDS_OF_STEP[step] ?? []).includes(k)).length;
  const landlordShown = values.landlordName.trim() || values.landlordEmail.trim();

  const titles = [
    [t("address.title"), t("address.lead")],
    [t("terms.title"), t("terms.lead")],
    [t("landlord.title"), t("landlord.lead")],
    [t("review.title"), t("review.lead")],
  ];
  const primary =
    step < REVIEW ? (
      <button
        type="submit"
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(12_31_25/0.16)] transition-colors hover:bg-ink-soft motion-reduce:transition-none sm:h-10 sm:w-auto"
      >
        {t("next")}
      </button>
    ) : (
      <Button pending={pending} fit>
        {pending ? t("review.submitting") : t("review.submit")}
      </Button>
    );
  const nextSteps = (
    <Timeline
      compact
      items={[
        { state: "todo", title: t("landlord.nextSend"), sub: t("landlord.nextSendText") },
        { state: "todo", title: t("landlord.nextApprove"), sub: t("landlord.nextApproveText") },
        { state: "todo", title: t("landlord.nextRecord"), sub: t("landlord.nextRecordText") },
      ]}
    />
  );
  const trust = (
    <TrustLines
      lines={[
        ["shield", t("rail.free")],
        ["lock", t("rail.privacy")],
      ]}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-surface sm:bg-paper">
      <FlowHeader
        title={t("flow.title")}
        steps={STEPS.map((k) => t(`steps.${k}`))}
        current={step}
        homeHref={homeHref}
        onBack={step > 0 ? () => go(step - 1) : undefined}
        onCancel={cancel}
        labels={{
          progress: t("flow.progress"),
          stepOf: t("flow.stepOf", { step: step + 1, total: STEPS.length }),
          done: t("flow.done"),
          current: t("flow.current"),
          back: t("back"),
          cancel: t("flow.cancel"),
          home: t("flow.home"),
        }}
      />
      <form ref={form} action={action} onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
        {Object.entries(values).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <div className="mx-auto flex w-full max-w-[1036px] flex-1 justify-center gap-8 px-5 pt-6 pb-8 sm:px-8 sm:pt-10 sm:pb-14">
          <div className="flex w-full max-w-[600px] min-w-0 flex-col gap-4">
            <section className="flex flex-col gap-6 sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-8">
              <div ref={top} tabIndex={-1} className="flex flex-col gap-1.5 outline-none">
                <h1 className="font-display text-[20px] leading-[26px] font-semibold sm:text-[22px] sm:leading-7">{titles[step][0]}</h1>
                <p className="text-sm text-muted">{titles[step][1]}</p>
              </div>

              {stepErrors > 1 && !(step === 0 && addressMode === "search") && <Notice kind="error">{t("flow.errorSummary", { count: stepErrors })}</Notice>}

              {step === 0 && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${id}-kind`}>{t("address.type")}</Label>
                    <select
                      id={`${id}-kind`}
                      value={values.propertyKind}
                      onChange={(e) => set("propertyKind")(e.target.value)}
                      aria-invalid={errors.propertyKind ? true : undefined}
                      aria-describedby={errors.propertyKind ? `${id}-kind-error` : undefined}
                      className={`${INPUT_CLASS} appearance-auto ${values.propertyKind ? "" : "text-muted"}`}
                    >
                      <option value="" disabled>
                        {t("address.typePlaceholder")}
                      </option>
                      {PROPERTY_KIND_GROUPS.map(({ group, kinds }) =>
                        group ? (
                          <optgroup key={group} label={k(`groups.${group}`)}>
                            {kinds.map((kind) => (
                              <option key={kind} value={kind} className="text-ink">
                                {k(kind)}
                              </option>
                            ))}
                          </optgroup>
                        ) : (
                          kinds.map((kind) => (
                            <option key={kind} value={kind} className="text-ink">
                              {k(kind)}
                            </option>
                          ))
                        ),
                      )}
                    </select>
                    {errors.propertyKind && <FieldError id={`${id}-kind-error`} message={t(`errors.${errors.propertyKind}`)} />}
                  </div>
                  {addressMode === "search" && (
                    <AddressSearch
                      onPick={pickFound}
                      onManual={useManual}
                      onUnavailable={useManual}
                      error={stepErrors ? s("pickRequired") : undefined}
                    />
                  )}
                  {addressMode === "picked" && (
                    <div className="flex items-center gap-3 rounded-[10px] border border-line bg-paper px-4 py-3.5">
                      <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-full bg-mist text-brand">
                        <Icon name="pin" size={16} strokeWidth={2} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-xs text-muted">{s("chosen")}</span>
                        <span className="text-sm font-semibold [overflow-wrap:anywhere]">
                          {`${values.streetName} ${values.streetType} ${withDot(values.houseNumber)}`.replace(/\s+/g, " ").trim()}
                        </span>
                        <span className="text-[13px] text-muted">{cityLine({ postalCode: values.postalCode, city: values.city })}</span>
                      </span>
                      <button type="button" onClick={() => setAddressMode("search")} className="inline-flex min-h-11 flex-none items-center px-1 text-sm font-semibold text-brand hover:underline">
                        {t("change")}
                      </button>
                    </div>
                  )}
                  {addressMode === "manual" && (
                    <>
                      <button type="button" onClick={() => setAddressMode("search")} className="-my-2 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-brand hover:underline">
                        <Icon name="search" size={16} strokeWidth={2} />
                        {s("backToSearch")}
                      </button>
                      <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
                        <TextField id={`${id}-pc`} label={t("address.postalCode")} value={values.postalCode} onChange={(e) => set("postalCode")(e.target.value)}
                          inputMode="numeric" autoComplete="postal-code" maxLength={4} error={err("postalCode")} />
                        <TextField id={`${id}-city`} label={t("address.city")} value={values.city} onChange={(e) => set("city")(e.target.value)}
                          autoComplete="address-level2" maxLength={100} error={err("city")} />
                      </div>
                      <TextField id={`${id}-street`} label={t("address.streetName")} value={values.streetName} onChange={(e) => set("streetName")(e.target.value)}
                        maxLength={100} error={err("streetName")} />
                      <div className="grid grid-cols-2 gap-3">
                        <TextField id={`${id}-type`} label={t("address.streetType")} value={values.streetType} onChange={(e) => set("streetType")(e.target.value)}
                          list={`${id}-types`} maxLength={30} error={err("streetType")} />
                        <TextField id={`${id}-no`} label={t("address.houseNumber")} value={values.houseNumber} onChange={(e) => set("houseNumber")(e.target.value)}
                          maxLength={20} error={err("houseNumber")} />
                      </div>
                      <datalist id={`${id}-types`}>
                        {STREET_TYPES.map((type) => (
                          <option key={type} value={type} />
                        ))}
                      </datalist>
                    </>
                  )}
                  {addressMode !== "search" && (
                    <section aria-labelledby={`${id}-unit`} className="flex flex-col gap-3">
                      <div className="flex flex-col gap-0.5">
                        <h2 id={`${id}-unit`} className="text-[15px] leading-5 font-semibold">
                          {t("address.unitTitle")}
                        </h2>
                        <p className="text-[13px] leading-[18px] text-muted">{t("address.unitLead")}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <TextField id={`${id}-bld`} label={t("address.building")} value={values.building} onChange={(e) => set("building")(e.target.value)} maxLength={20} />
                        <TextField id={`${id}-stair`} label={t("address.staircase")} value={values.staircase} onChange={(e) => set("staircase")(e.target.value)} maxLength={20} />
                        <FloorInput id={`${id}-floor`} value={values.floor} onChange={set("floor")} />
                        <TextField id={`${id}-door`} label={t("address.door")} value={values.door} onChange={(e) => set("door")(e.target.value)} maxLength={20} />
                      </div>
                    </section>
                  )}
                </>
              )}

              {step === 1 && (
                <>
                  <Segmented
                    name="termSwitch"
                    legend={t("terms.duration")}
                    showLegend
                    value={values.term === "open" ? "open" : "fixed"}
                    onChange={set("term")}
                    options={[
                      { value: "fixed", label: t("terms.fixed") },
                      { value: "open", label: t("terms.openEnded") },
                    ]}
                  />
                  <div className="grid items-start gap-4 sm:grid-cols-2 sm:gap-3">
                    <TextField id={`${id}-start`} type="date" max={LATEST_DATE} label={t("terms.start")} value={values.startDate}
                      onChange={(e) => set("startDate")(e.target.value)} error={err("startDate")} />
                    {values.term !== "open" && (
                      <div className="flex flex-col gap-2">
                        <TextField id={`${id}-end`} type="date" max={LATEST_DATE} label={t("terms.end")} value={values.endDate} min={values.startDate || undefined}
                          onChange={(e) => set("endDate")(e.target.value)} error={err("endDate")} />
                        {/^\d{4}-\d{2}-\d{2}$/.test(values.startDate) && (
                          <div className="flex gap-1.5">
                            {[1, 2].map((years) => (
                              <button
                                key={years}
                                type="button"
                                aria-label={t("terms.plusYearsLabel", { count: years })}
                                aria-pressed={values.endDate === endAfter(values.startDate, years)}
                                onClick={() => set("endDate")(endAfter(values.startDate, years))}
                                className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[12.5px] font-medium text-ink-soft hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
                              >
                                {t("terms.plusYears", { count: years })}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid items-start gap-4 sm:grid-cols-2 sm:gap-3">
                    <MoneyField id={`${id}-rent`} label={t("terms.rent")} value={values.monthlyRent} currency={t("terms.currency")}
                      onChange={set("monthlyRent")} onBlur={formatAmount("monthlyRent")} error={err("monthlyRent")} />
                    <MoneyField id={`${id}-deposit`} label={t("terms.deposit")} optional={t("optional")} hint={t("terms.depositHint")} value={values.deposit}
                      currency={t("terms.currency")} onChange={set("deposit")} onBlur={formatAmount("deposit")} error={err("deposit")} />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <TextField id={`${id}-email`} type="email" label={t("landlord.email")} value={values.landlordEmail} onChange={(e) => set("landlordEmail")(e.target.value)}
                    autoComplete="off" inputMode="email" maxLength={254} error={err("landlordEmail")} />
                  <TextField id={`${id}-name`} label={t("landlord.name")} optional={t("optional")} hint={t("landlord.nameHint")} value={values.landlordName}
                    onChange={(e) => set("landlordName")(e.target.value)} autoComplete="off" maxLength={200} />
                  <section aria-labelledby={`${id}-next`} className="flex flex-col gap-3 rounded-[10px] border border-line bg-paper p-4">
                    <h2 id={`${id}-next`} className="text-[15px] leading-5 font-semibold">
                      {t("landlord.nextTitle")}
                    </h2>
                    {nextSteps}
                  </section>
                </>
              )}

              {step === REVIEW && (
                <>
                  <div className="flex flex-col">
                    <ReviewSection title={t("steps.home")} edit={t("change")} editLabel={t("review.editSection", { section: t("steps.home") })} onEdit={() => go(0)}>
                      <p className="flex flex-col text-sm">
                        <span className="text-muted">{k(values.propertyKind)}</span>
                        <span className="font-semibold [overflow-wrap:anywhere]">{streetLine(parts)}</span>
                        <span className="text-muted">{cityLine(parts)}</span>
                      </p>
                    </ReviewSection>
                    <ReviewSection title={t("steps.lease")} edit={t("change")} editLabel={t("review.editSection", { section: t("steps.lease") })} onEdit={() => go(1)}>
                      <KeyValues
                        rows={[
                          [t("rows.rent"), money(amount("monthlyRent"), locale)],
                          ...(amount("deposit") != null ? [[t("rows.deposit"), money(amount("deposit"), locale)] as [string, string]] : []),
                          [t("rows.start"), date(values.startDate, locale)],
                          values.term === "open" ? [t("rows.term"), t("terms.openEnded")] : [t("rows.end"), date(values.endDate, locale)],
                        ]}
                      />
                    </ReviewSection>
                    <ReviewSection title={t("steps.landlord")} edit={t("change")} editLabel={t("review.editSection", { section: t("steps.landlord") })} onEdit={() => go(2)}>
                      <KeyValues
                        rows={[
                          [t("rows.email"), values.landlordEmail.trim()],
                          ...(values.landlordName.trim() ? [[t("rows.name"), values.landlordName.trim()] as [string, string]] : []),
                        ]}
                      />
                    </ReviewSection>
                  </div>
                  <p className="flex gap-2.5 rounded-lg bg-mist px-3.5 py-3 text-[13px] leading-[19px] text-ink-soft">
                    <Icon name="lock" size={16} strokeWidth={2} className="mt-0.5 flex-none text-brand" />
                    <span>{t("review.note", { name: landlordShown })}</span>
                  </p>
                </>
              )}

              {state.status === "error" && state.error && <Notice kind="error">{t(`errors.${state.error}`)}</Notice>}

              <div className="hidden items-center justify-between gap-4 border-t border-paper pt-5 sm:flex">
                <button type="button" onClick={step > 0 ? () => go(step - 1) : cancel} className="-ml-3 inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-paper">
                  <Icon name="back" size={16} strokeWidth={2} />
                  {t("back")}
                </button>
                {primary}
              </div>
            </section>
            {step === REVIEW && <div className="lg:hidden">{trust}</div>}
          </div>

          <aside aria-label={t("rail.title")} className="hidden w-[340px] flex-none flex-col gap-4 lg:flex">
            {step === REVIEW ? (
              <section className="flex flex-col gap-3.5 rounded-xl border border-line bg-surface p-5">
                <h2 className="text-[15px] leading-5 font-semibold">{t("landlord.nextTitle")}</h2>
                {nextSteps}
              </section>
            ) : (
              <section className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{t("rail.title")}</h2>
                <ul className="flex flex-col">
                  <RailItem name={t("steps.home")} value={step > 0 ? `${k(values.propertyKind)} · ${fullAddress(parts)}` : null} empty={t("rail.empty")} />
                  <RailItem
                    name={t("steps.lease")}
                    value={step > 1 ? t("rail.termsLine", { rent: money(amount("monthlyRent"), locale), period }) : null}
                    empty={t("rail.empty")}
                  />
                  <RailItem name={t("steps.landlord")} value={step > 2 ? values.landlordEmail.trim() : null} empty={t("rail.empty")} />
                </ul>
              </section>
            )}
            {trust}
          </aside>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-line bg-surface px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:hidden">{primary}</div>
      </form>

      {leaving && (
        <Dialog open onClose={() => setLeaving(false)} title={t("flow.leaveTitle")} description={t("flow.leaveText")} closeLabel={t("flow.close")}>
          <DialogActions>
            <button type="button" data-autofocus onClick={() => setLeaving(false)} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
              {t("flow.leaveStay")}
            </button>
            <button type="button" onClick={() => router.push(homeHref)} className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft sm:h-10">
              {t("flow.leaveConfirm")}
            </button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

function RailItem({ name, value, empty }: { name: string; value: string | null; empty: string }) {
  return (
    <li className="flex gap-3 border-t border-paper py-3 first:border-t-0">
      <span
        aria-hidden="true"
        className={`mt-px flex size-[18px] flex-none items-center justify-center rounded-full ${value ? "bg-ink text-white" : "border-[1.5px] border-field"}`}
      >
        {value && <Icon name="check" size={11} strokeWidth={3} />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12.5px] text-muted">{name}</span>
        <span className={`text-[13.5px] [overflow-wrap:anywhere] ${value ? "font-medium" : "text-muted"}`}>{value ?? empty}</span>
      </span>
    </li>
  );
}

function ReviewSection({ title, edit, editLabel, onEdit, children }: { title: string; edit: string; editLabel: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1 border-t border-paper py-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{title}</h2>
        <button type="button" onClick={onEdit} aria-label={editLabel} className="-mr-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-brand hover:underline sm:min-h-8">
          <Icon name="edit" size={14} strokeWidth={2} />
          {edit}
        </button>
      </div>
      {children}
    </section>
  );
}
