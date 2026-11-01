"use client";

import { useActionState, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { Button, ButtonLink, INPUT_CLASS, Label, Notice, PageTitle, TextField } from "@/components/ui/form";
import { InfoTip } from "@/components/ui/InfoTip";
import { answerInvitation, type InvitationState } from "@/features/invitations/actions";
import { isLocale } from "@/i18n/config";
import { date, money, number } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
import { takeOverLease, type TakeOverState } from "./actions";
import { ChangeNote, DetailRows, MoneyField, Segmented } from "./ui";
import { clearError, hasErrors, parseAmount, validateTerms, type Errors, type Values } from "./validate";

export type LandlordAccount = { id: string; name: string; plan: Enums<"account_plan">; propertyCount: number };
export type LandlordProperty = { id: string; accountId: string; label: string };
export type ProposedTerms = { startDate: string; endDate: string | null; monthlyRent: number; deposit: number | null };

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/**
 * Steps 5–6 for the landlord: choose the managing account and the property, then check the terms.
 * Any changed or added term goes back to the tenant for approval; unchanged terms confirm the lease at once.
 */
export function LandlordTakeOver({
  token,
  requestId,
  tenantName,
  address,
  proposed,
  accounts,
  properties,
  validUntil,
  homeHref,
}: {
  token: string;
  requestId: string;
  tenantName: string;
  address: string;
  proposed: ProposedTerms;
  accounts: LandlordAccount[];
  properties: LandlordProperty[];
  validUntil: string;
  homeHref: string;
}) {
  const t = useTranslations("leaseRequest");
  const invite = useTranslations("invite");
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const id = useId();
  const top = useRef<HTMLHeadingElement>(null);
  const [review, setReview] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [propertyMode, setPropertyMode] = useState<"new" | "existing">("new");
  const [propertyId, setPropertyId] = useState("");
  const [values, setValues] = useState<Values>({
    startDate: proposed.startDate,
    term: proposed.endDate ? "fixed" : "open",
    endDate: proposed.endDate ?? "",
    monthlyRent: number(proposed.monthlyRent, locale),
    deposit: proposed.deposit == null ? "" : number(proposed.deposit, locale),
    paymentDay: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [state, action, pending] = useActionState<TakeOverState, FormData>(async (prev, form) => {
    const next = await takeOverLease(prev, form);
    if (next.status === "error" && next.fields) setErrors(next.fields);
    return next;
  }, { status: "idle" });
  const [declined, decline, declining] = useActionState<InvitationState, FormData>(answerInvitation, { status: "idle" });

  const accountProperties = properties.filter((p) => p.accountId === accountId);
  const set = (key: string) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => clearError(e, key));
  };
  const err = (key: string) => (errors[key] ? t(`errors.${errors[key]}`) : undefined);
  const formatAmount = (key: string) => () => {
    const n = parseAmount(values[key]);
    if (n != null && !Number.isNaN(n)) set(key)(number(n, locale));
  };
  const go = (to: boolean) => {
    setReview(to);
    requestAnimationFrame(() => top.current?.focus());
  };

  if (declined.status === "declined") {
    return (
      <>
        <PageTitle>{invite("declined.title")}</PageTitle>
        <p className="text-[15px] text-muted">{invite("declined.text")}</p>
        <div className="mt-auto pt-4">
          <ButtonLink href={homeHref}>{invite("declined.continue")}</ButtonLink>
        </div>
      </>
    );
  }
  if (state.status === "done") {
    const key = state.needsTenantApproval ? "sent" : "done";
    return (
      <>
        <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-mist text-brand">
          <Icon name={state.needsTenantApproval ? "mail" : "check"} size={24} />
        </span>
        <PageTitle>{t(`landlordSide.${key}Title`)}</PageTitle>
        <p className="text-[15px] text-muted">{t(`landlordSide.${key}Text`, { name: tenantName })}</p>
        <div className="mt-auto pt-4">
          <ButtonLink href={homeHref}>{t("landlordSide.continue")}</ButtonLink>
        </div>
      </>
    );
  }

  // Notes under the fields the landlord changed or added.
  const rent = parseAmount(values.monthlyRent);
  const deposit = parseAmount(values.deposit);
  const changed = (label: string) => t("landlordSide.changedNote", { value: label });
  const notes = {
    startDate: values.startDate !== proposed.startDate ? changed(date(proposed.startDate, locale)) : undefined,
    endDate:
      (values.term === "open" ? null : values.endDate || null) !== proposed.endDate
        ? changed(proposed.endDate ? date(proposed.endDate, locale) : t("terms.openEnded"))
        : undefined,
    monthlyRent: rent !== proposed.monthlyRent ? changed(money(proposed.monthlyRent, locale)) : undefined,
    deposit: deposit !== proposed.deposit ? (proposed.deposit == null ? t("landlordSide.addedNote") : changed(money(proposed.deposit, locale))) : undefined,
    paymentDay: values.paymentDay ? t("landlordSide.addedNote") : undefined,
  };

  const toReview = () => {
    if (propertyMode === "existing" && !propertyId) {
      setErrors({ propertyId: "required" });
      return;
    }
    setErrors({});
    go(true);
  };
  const submitCheck = (e: React.FormEvent) => {
    const found = validateTerms(values);
    if (hasErrors(found)) {
      e.preventDefault();
      setErrors(found);
    }
  };

  if (!review) {
    return (
      <>
        <PageTitle eyebrow={invite("label")}>{t("landlordSide.title")}</PageTitle>
        <p className="text-[15px] text-muted">{t("landlordSide.intro", { name: tenantName })}</p>
        <DetailRows
          rows={[
            [t("rows.property"), address],
            [t("rows.rent"), money(proposed.monthlyRent, locale)],
            [t("rows.start"), date(proposed.startDate, locale)],
            [t("rows.end"), proposed.endDate ? date(proposed.endDate, locale) : t("terms.openEnded")],
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-account`}>
            {t("landlordSide.account")}
            <InfoTip text={t("landlordSide.accountTip")} />
          </Label>
          <select
            id={`${id}-account`}
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setPropertyId("");
            }}
            aria-describedby={`${id}-account-hint`}
            className={`${INPUT_CLASS} appearance-auto`}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {(() => {
            const a = accounts.find((x) => x.id === accountId);
            return a ? (
              <p id={`${id}-account-hint`} className="text-[13px] text-muted">
                {t("landlordSide.accountHint", { plan: t(`landlordSide.plans.${a.plan}`), count: a.propertyCount })}
              </p>
            ) : null;
          })()}
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold">{t("landlordSide.property")}</legend>
          {(
            [
              ["new", "newProperty", "newPropertyHint"],
              ["existing", "existingProperty", accountProperties.length ? "existingPropertyHint" : "noProperties"],
            ] as const
          ).map(([mode, title, hint]) => {
            const disabled = mode === "existing" && accountProperties.length === 0;
            return (
              <label
                key={mode}
                className={`flex items-center gap-3 rounded-xl border border-field bg-surface px-3.5 py-3 has-checked:border-[1.5px] has-checked:border-brand has-checked:bg-paper has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${disabled ? "opacity-60" : "cursor-pointer"}`}
              >
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold">{t(`landlordSide.${title}`)}</span>
                  <span className="text-[13px] text-muted">{t(`landlordSide.${hint}`)}</span>
                </span>
                <input
                  type="radio"
                  name="propertyModeSwitch"
                  checked={propertyMode === mode}
                  disabled={disabled}
                  onChange={() => setPropertyMode(mode)}
                  className="size-4.5 flex-none accent-brand"
                />
              </label>
            );
          })}
        </fieldset>
        {propertyMode === "existing" && accountProperties.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-property`}>{t("landlordSide.propertySelect")}</Label>
            <select
              id={`${id}-property`}
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setErrors({});
              }}
              aria-invalid={errors.propertyId ? true : undefined}
              className={`${INPUT_CLASS} appearance-auto`}
            >
              <option value="" disabled>
                {t("landlordSide.propertySelect")}
              </option>
              {accountProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {errors.propertyId && <p className="text-[13px] font-semibold text-danger-ink">{t("errors.required")}</p>}
          </div>
        )}
        {declined.status === "error" && <Notice kind="error">{invite(`errors.${declined.error}`)}</Notice>}
        <form action={decline} className="mt-auto flex flex-col gap-2.5 pt-4">
          <input type="hidden" name="token" value={token} />
          <button
            type="button"
            onClick={toReview}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand px-5.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            {t("landlordSide.toReview")}
          </button>
          <Button name="intent" value="decline" variant="secondary" pending={declining}>
            {t("landlordSide.decline")}
          </Button>
          <p className="text-center text-[13px] text-muted">{invite("validUntil", { date: validUntil })}</p>
        </form>
      </>
    );
  }

  return (
    <form action={action} onSubmit={submitCheck} noValidate className="flex flex-1 flex-col gap-4">
      {Object.entries({ ...values, token, requestId, accountId, propertyMode, propertyId }).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="button" onClick={() => go(false)} className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start px-2 text-sm font-semibold">
        <Icon name="back" size={18} />
        {t("back")}
      </button>
      <div className="flex flex-col gap-1.5">
        <h1 ref={top} tabIndex={-1} className="font-display text-[26px] leading-tight font-semibold outline-none">
          {t("landlordSide.reviewTitle")}
        </h1>
        <p className="text-[15px] text-muted">{t("landlordSide.reviewLead")}</p>
      </div>
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
      <div className={values.term === "open" ? "" : "grid grid-cols-2 gap-2.5"}>
        <div className="flex flex-col gap-1.5">
          <TextField id={`${id}-start`} type="date" label={t("terms.start")} value={values.startDate} onChange={(e) => set("startDate")(e.target.value)} error={err("startDate")} />
          {notes.startDate && <ChangeNote id={`${id}-start-note`}>{notes.startDate}</ChangeNote>}
        </div>
        {values.term !== "open" && (
          <div className="flex flex-col gap-1.5">
            <TextField id={`${id}-end`} type="date" label={t("terms.end")} value={values.endDate} min={values.startDate || undefined}
              onChange={(e) => set("endDate")(e.target.value)} error={err("endDate")} />
            {notes.endDate && <ChangeNote id={`${id}-end-note`}>{notes.endDate}</ChangeNote>}
          </div>
        )}
      </div>
      {values.term === "open" && notes.endDate && <ChangeNote id={`${id}-term-note`}>{notes.endDate}</ChangeNote>}
      <MoneyField id={`${id}-rent`} label={t("terms.rent")} value={values.monthlyRent} currency={t("terms.currency")}
        onChange={set("monthlyRent")} onBlur={formatAmount("monthlyRent")} error={err("monthlyRent")} note={notes.monthlyRent} />
      <MoneyField id={`${id}-deposit`} label={t("landlordSide.deposit")} value={values.deposit} currency={t("terms.currency")}
        onChange={set("deposit")} onBlur={formatAmount("deposit")} error={err("deposit")} note={notes.deposit} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-pay`}>{t("landlordSide.paymentDay")}</Label>
        <select id={`${id}-pay`} value={values.paymentDay} onChange={(e) => set("paymentDay")(e.target.value)}
          aria-describedby={notes.paymentDay ? `${id}-pay-note` : undefined} className={`${INPUT_CLASS} appearance-auto`}>
          <option value="">{t("landlordSide.paymentDayNone")}</option>
          {PAYMENT_DAYS.map((d) => (
            <option key={d} value={d}>
              {t("paymentDayValue", { day: d })}
            </option>
          ))}
        </select>
        {notes.paymentDay && <ChangeNote id={`${id}-pay-note`}>{notes.paymentDay}</ChangeNote>}
      </div>
      {state.status === "error" && state.error && <Notice kind="error">{t(`errors.${state.error}`)}</Notice>}
      <div className="mt-auto pt-4">
        <Button pending={pending}>{pending ? t("landlordSide.submitting") : t("landlordSide.submit")}</Button>
      </div>
    </form>
  );
}
