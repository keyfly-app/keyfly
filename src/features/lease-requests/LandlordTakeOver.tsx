"use client";

import { useActionState, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { Icon, type IconName } from "@/components/Icon";
import { LogoFull } from "@/components/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, ButtonLink, INPUT_CLASS, Label, Notice, TextField } from "@/components/ui/form";
import { InfoTip } from "@/components/ui/InfoTip";
import { answerInvitation, type InvitationState } from "@/features/invitations/actions";
import { isLocale } from "@/i18n/config";
import { date, money, number } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";
import { takeOverLease, type TakeOverState } from "./actions";
import { ChangeNote, KeyValues, LATEST_DATE, MoneyField, Segmented, TrustLines } from "./ui";
import { clearError, hasErrors, parseAmount, validateTerms, type Errors, type Values } from "./validate";

export type LandlordAccount = { id: string; name: string; kind: Enums<"account_kind">; plan: Enums<"account_plan">; propertyCount: number };
export type LandlordProperty = { id: string; accountId: string; label: string };
export type ProposedTerms = { startDate: string; endDate: string | null; monthlyRent: number; deposit: number | null };

const PAYMENT_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const STEPS = ["account", "terms"] as const;

/** A choice as a selectable card (account, new or existing property). */
function RadioCard({
  name,
  checked,
  disabled = false,
  onChange,
  title,
  text,
  icon,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  title: string;
  text: string;
  icon?: IconName;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-[10px] border px-4 py-3.5 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${checked ? "border-[1.5px] border-ink bg-paper" : "border-field bg-surface"} ${disabled ? "opacity-55" : "cursor-pointer hover:border-ink"}`}
    >
      {icon && <Icon name={icon} size={18} className="flex-none text-brand" />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold [overflow-wrap:anywhere]">{title}</span>
        <span className="text-[13px] text-muted">{text}</span>
      </span>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} className="size-[18px] flex-none accent-ink" />
    </label>
  );
}

/**
 * The invited landlord takes the lease over (canvas "App v2.3": Bérbeadó – fiók, feltételek, kész) as a focused flow:
 * 1. the managing account and the property, 2. the terms with what the tenant entered under each field.
 * Unchanged terms record the lease at once; any change goes back to the tenant for approval.
 */
export function LandlordTakeOver({
  token,
  requestId,
  tenantName,
  street,
  city,
  proposed,
  accounts,
  properties,
  homeHref,
}: {
  token: string;
  requestId: string;
  tenantName: string;
  street: string;
  city: string;
  proposed: ProposedTerms;
  accounts: LandlordAccount[];
  properties: LandlordProperty[];
  homeHref: string;
}) {
  const t = useTranslations("leaseRequest");
  const ls = useTranslations("leaseRequest.landlordSide");
  const invite = useTranslations("invite");
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const router = useRouter();
  const id = useId();
  const top = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [propertyMode, setPropertyMode] = useState<"new" | "existing">("new");
  const [propertyId, setPropertyId] = useState("");
  const initial: Values = {
    startDate: proposed.startDate,
    term: proposed.endDate ? "fixed" : "open",
    endDate: proposed.endDate ?? "",
    monthlyRent: number(proposed.monthlyRent, locale),
    deposit: proposed.deposit == null ? "" : number(proposed.deposit, locale),
    paymentDay: "",
  };
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [state, action, pending] = useActionState<TakeOverState, FormData>(
    async (prev, form) => {
      const next = await takeOverLease(prev, form);
      if (next.status === "error" && next.fields) setErrors(next.fields);
      return next;
    },
    { status: "idle" },
  );
  const [declined, decline, declinePending] = useActionState<InvitationState, FormData>(answerInvitation, { status: "idle" });

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
  const go = (to: number) => {
    setStep(to);
    requestAnimationFrame(() => top.current?.focus());
  };
  const endOf = (iso: string | null) => (iso ? date(iso, locale) : t("terms.openEnded"));

  // What the landlord changed or added, against the tenant's request.
  const rent = parseAmount(values.monthlyRent);
  const deposit = parseAmount(values.deposit);
  const end = values.term === "open" ? null : values.endDate || null;
  const changes = {
    startDate: values.startDate !== proposed.startDate,
    endDate: end !== proposed.endDate,
    monthlyRent: rent !== proposed.monthlyRent,
    deposit: deposit !== proposed.deposit,
    paymentDay: values.paymentDay !== "",
  };
  const changeCount = Object.values(changes).filter(Boolean).length;
  const note = (key: keyof typeof changes, tenantValue: string, added = false) =>
    changes[key] ? (added ? ls("addedNote") : ls("changedNote", { value: tenantValue })) : ls("tenantSaid", { value: tenantValue });
  const dirty = changeCount > 0 || propertyMode !== "new" || accountId !== (accounts[0]?.id ?? "");
  const cancel = () => (dirty ? setLeaving(true) : router.push(homeHref));

  const next = () => {
    if (propertyMode === "existing" && !propertyId) {
      setErrors({ propertyId: "required" });
      requestAnimationFrame(() => document.getElementById(`${id}-property`)?.focus());
      return;
    }
    setErrors({});
    go(1);
  };
  const onSubmit = (e: React.FormEvent) => {
    if (step === 0) {
      e.preventDefault();
      return next();
    }
    const found = validateTerms(values);
    if (hasErrors(found)) {
      e.preventDefault();
      setErrors(found);
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
    }
  };

  if (declined.status === "declined" || state.status === "done") {
    const kind = declined.status === "declined" ? "declined" : state.status === "done" && state.needsTenantApproval ? "sent" : "done";
    const title = kind === "declined" ? invite("declined.title") : ls(kind === "sent" ? "sentTitle" : "doneTitle");
    const text = kind === "declined" ? invite("declined.text") : ls(kind === "sent" ? "sentText" : "doneText", { name: tenantName });
    return (
      <div className="flex min-h-dvh flex-col bg-surface sm:bg-paper">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex h-14 max-w-[1120px] items-center px-4 sm:px-8">
            <LogoFull height={20} />
          </div>
        </header>
        <main className="flex flex-1 justify-center px-5 py-10 sm:py-16">
          <section className="flex w-full max-w-[480px] flex-col gap-5 sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-8">
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-mist text-brand">
              <Icon name={kind === "sent" ? "send" : kind === "done" ? "check" : "x"} size={22} strokeWidth={2} />
            </span>
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-[22px] leading-7 font-semibold">{title}</h1>
              <p className="text-sm text-muted">{text}</p>
            </div>
            {kind !== "declined" && (
              <KeyValues
                rows={[
                  [t("rows.property"), street],
                  [t("rows.rent"), money(rent ?? proposed.monthlyRent, locale)],
                  ...(values.paymentDay ? [[ls("paymentDay"), t("paymentDayValue", { day: Number(values.paymentDay) })] as [string, string]] : []),
                ]}
              />
            )}
            <ButtonLink href={homeHref}>{ls("continue")}</ButtonLink>
          </section>
        </main>
      </div>
    );
  }

  const titles = [
    [ls("s1Title"), ls("s1Lead")],
    [ls("s2Title"), ls("s2Lead", { name: tenantName })],
  ];
  const primaryLabel = step === 0 ? t("next") : pending ? ls("submitting") : changeCount ? ls("sendBack") : ls("approve");
  const primary =
    step === 0 ? (
      <button type="submit" className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(12_31_25/0.16)] hover:bg-ink-soft sm:h-10 sm:w-auto">
        {primaryLabel}
      </button>
    ) : (
      <Button pending={pending} fit>
        {primaryLabel}
      </Button>
    );
  const changeBar = changeCount > 0 && (
    <p className="flex items-center gap-2.5 rounded-lg bg-warning-soft px-3.5 py-2.5 text-[13px] font-semibold text-warning-ink">
      <Icon name="info" size={16} strokeWidth={2} className="flex-none" />
      {ls("changeSum", { count: changeCount, name: tenantName })}
    </p>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-surface sm:bg-paper">
      <FlowHeader
        title={ls("title")}
        steps={STEPS.map((k) => ls(`steps.${k}`))}
        current={step}
        onBack={step > 0 ? () => go(0) : undefined}
        onCancel={cancel}
        labels={{
          progress: t("flow.progress"),
          stepOf: t("flow.stepOf", { step: step + 1, total: STEPS.length }),
          done: t("flow.done"),
          current: t("flow.current"),
          back: t("back"),
          cancel: t("flow.cancel"),
        }}
      />
      <form action={action} onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
        {Object.entries({ ...values, token, requestId, accountId, propertyMode, propertyId }).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <div className="mx-auto flex w-full max-w-[1036px] flex-1 justify-center gap-8 px-5 pt-6 pb-8 sm:px-8 sm:pt-10 sm:pb-14">
          <div className="flex w-full max-w-[600px] min-w-0 flex-col gap-4">
            <section className="flex flex-col gap-6 sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-8">
              <div ref={top} tabIndex={-1} className="flex flex-col gap-1.5 outline-none">
                <h1 className="font-display text-[20px] leading-[26px] font-semibold sm:text-[22px] sm:leading-7">{titles[step][0]}</h1>
                <p className="text-sm text-muted">{titles[step][1]}</p>
              </div>

              {step === 0 && (
                <>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium">
                      {ls("account")}
                      <InfoTip text={ls("accountTip")} />
                    </legend>
                    {accounts.map((a) => (
                      <RadioCard
                        key={a.id}
                        name="accountSwitch"
                        checked={accountId === a.id}
                        onChange={() => {
                          setAccountId(a.id);
                          setPropertyId("");
                          if (!properties.some((p) => p.accountId === a.id)) setPropertyMode("new");
                        }}
                        icon={a.kind === "company" ? "building" : "user"}
                        title={a.name}
                        text={ls("accountHint", { kind: a.kind, plan: ls(`plans.${a.plan}`), count: a.propertyCount })}
                      />
                    ))}
                  </fieldset>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1.5 text-[13px] font-medium">{ls("property")}</legend>
                    <RadioCard name="propertySwitch" checked={propertyMode === "new"} onChange={() => setPropertyMode("new")} title={ls("newProperty")} text={ls("newPropertyHint")} />
                    <RadioCard
                      name="propertySwitch"
                      checked={propertyMode === "existing"}
                      disabled={accountProperties.length === 0}
                      onChange={() => setPropertyMode("existing")}
                      title={ls("existingProperty")}
                      text={accountProperties.length ? ls("existingPropertyHint") : ls("noProperties")}
                    />
                  </fieldset>
                  {propertyMode === "existing" && accountProperties.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`${id}-property`}>{ls("propertySelect")}</Label>
                      <select
                        id={`${id}-property`}
                        value={propertyId}
                        onChange={(e) => {
                          setPropertyId(e.target.value);
                          setErrors({});
                        }}
                        aria-invalid={errors.propertyId ? true : undefined}
                        aria-describedby={errors.propertyId ? `${id}-property-error` : undefined}
                        className={`${INPUT_CLASS} appearance-auto`}
                      >
                        <option value="" disabled>
                          {ls("propertyPick")}
                        </option>
                        {accountProperties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      {errors.propertyId && (
                        <p id={`${id}-property-error`} className="flex items-center gap-1.5 text-[12.5px] font-medium text-danger-ink">
                          <Icon name="alert" size={14} strokeWidth={2.2} />
                          {t("errors.required")}
                        </p>
                      )}
                    </div>
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
                  <div className="grid items-start gap-x-3 gap-y-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <TextField id={`${id}-start`} type="date" max={LATEST_DATE} label={t("terms.start")} value={values.startDate}
                        onChange={(e) => set("startDate")(e.target.value)} error={err("startDate")} />
                      <Note id={`${id}-start-note`} changed={changes.startDate}>{note("startDate", date(proposed.startDate, locale))}</Note>
                    </div>
                    {values.term !== "open" ? (
                      <div className="flex flex-col gap-1.5">
                        <TextField id={`${id}-end`} type="date" max={LATEST_DATE} label={t("terms.end")} value={values.endDate} min={values.startDate || undefined}
                          onChange={(e) => set("endDate")(e.target.value)} error={err("endDate")} />
                        <Note id={`${id}-end-note`} changed={changes.endDate}>{note("endDate", endOf(proposed.endDate))}</Note>
                      </div>
                    ) : (
                      changes.endDate && <Note id={`${id}-term-note`} changed>{note("endDate", endOf(proposed.endDate))}</Note>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <MoneyField id={`${id}-rent`} label={t("terms.rent")} value={values.monthlyRent} currency={t("terms.currency")}
                        onChange={set("monthlyRent")} onBlur={formatAmount("monthlyRent")} error={err("monthlyRent")} />
                      <Note id={`${id}-rent-note`} changed={changes.monthlyRent}>{note("monthlyRent", money(proposed.monthlyRent, locale))}</Note>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <MoneyField id={`${id}-deposit`} label={ls("deposit")} optional={t("optional")} value={values.deposit} currency={t("terms.currency")}
                        onChange={set("deposit")} onBlur={formatAmount("deposit")} error={err("deposit")} />
                      <Note id={`${id}-deposit-note`} changed={changes.deposit} added={proposed.deposit == null}>
                        {note("deposit", proposed.deposit == null ? t("reconfirm.none") : money(proposed.deposit, locale), proposed.deposit == null)}
                      </Note>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`${id}-pay`}>
                        {ls("paymentDay")}
                        <span className="font-normal text-muted">{t("optional")}</span>
                      </Label>
                      <select id={`${id}-pay`} value={values.paymentDay} onChange={(e) => set("paymentDay")(e.target.value)}
                        aria-describedby={`${id}-pay-note`} className={`${INPUT_CLASS} appearance-auto`}>
                        <option value="">{ls("paymentDayNone")}</option>
                        {PAYMENT_DAYS.map((d) => (
                          <option key={d} value={d}>
                            {t("paymentDayValue", { day: d })}
                          </option>
                        ))}
                      </select>
                      <Note id={`${id}-pay-note`} changed={changes.paymentDay} added>
                        {note("paymentDay", t("reconfirm.none"), true)}
                      </Note>
                    </div>
                  </div>
                  <div className="hidden sm:block">{changeBar}</div>
                </>
              )}

              {state.status === "error" && state.error && <Notice kind="error">{t(`errors.${state.error}`)}</Notice>}
              {declined.status === "error" && <Notice kind="error">{invite(`errors.${declined.error}`)}</Notice>}

              <div className="hidden items-center justify-between gap-4 border-t border-paper pt-5 sm:flex">
                {step === 0 ? (
                  <button type="button" onClick={() => setDeclining(true)} className="-ml-2 inline-flex h-10 items-center rounded-lg px-2 text-sm font-medium text-danger-ink hover:bg-danger-soft">
                    {ls("decline")}
                  </button>
                ) : (
                  <button type="button" onClick={() => go(0)} className="-ml-3 inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-paper">
                    <Icon name="back" size={16} strokeWidth={2} />
                    {t("back")}
                  </button>
                )}
                {primary}
              </div>
            </section>
            {step === 0 && (
              <button type="button" onClick={() => setDeclining(true)} className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-danger-ink sm:hidden">
                {ls("decline")}
              </button>
            )}
          </div>

          <aside aria-label={ls("railTitle")} className="hidden w-[340px] flex-none flex-col gap-3.5 lg:flex">
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{ls("railTitle")}</h2>
              <div className="flex items-center gap-2.5">
                <Avatar src={null} initials={tenantName.split(/\s+/).slice(0, 2).map((p) => p[0]?.toLocaleUpperCase() ?? "").join("")} size={32} />
                <span className="text-[13.5px] font-semibold">{tenantName}</span>
              </div>
              <KeyValues
                rows={[
                  [t("rows.property"), `${street}, ${city}`],
                  [t("rows.rent"), money(proposed.monthlyRent, locale)],
                  ...(proposed.deposit != null ? [[t("rows.deposit"), money(proposed.deposit, locale)] as [string, string]] : []),
                  [t("rows.start"), date(proposed.startDate, locale)],
                  [proposed.endDate ? t("rows.end") : t("rows.term"), endOf(proposed.endDate)],
                ]}
              />
            </section>
            <TrustLines lines={[["shield", ls("railFree")]]} />
          </aside>
        </div>

        <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-line bg-surface px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:hidden">
          {step === 1 && changeCount > 0 && <p className="text-center text-[12.5px] font-semibold text-warning-ink">{ls("changeSum", { count: changeCount, name: tenantName })}</p>}
          {primary}
        </div>
      </form>

      {declining && (
        <Dialog open onClose={() => setDeclining(false)} title={ls("declineTitle")} description={ls("declineText", { name: tenantName })} closeLabel={t("flow.close")}>
          <form action={decline} onSubmit={() => setDeclining(false)} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="intent" value="decline" />
            <DialogActions>
              <button type="button" data-autofocus onClick={() => setDeclining(false)} className="inline-flex h-11 items-center justify-center rounded-lg border border-field px-4 text-sm font-medium hover:border-ink sm:h-10">
                {t("flow.cancel")}
              </button>
              <Button variant="danger" pending={declinePending} fit>
                {ls("declineConfirm")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
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

/** Under a term: what the tenant entered; amber once changed, blue for a term the tenant did not give. */
function Note({ id, changed, added = false, children }: { id: string; changed: boolean; added?: boolean; children: React.ReactNode }) {
  if (!changed) return <p id={id} className="text-[12.5px] text-muted">{children}</p>;
  if (added)
    return (
      <p id={id} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-info-ink">
        <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-info-ink" />
        {children}
      </p>
    );
  return <ChangeNote id={id}>{children}</ChangeNote>;
}
