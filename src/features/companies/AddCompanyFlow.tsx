"use client";

import { useActionState, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { Icon } from "@/components/Icon";
import { Button, ButtonLink, FieldError, INPUT_CLASS, Label, Notice, Optional, TextField } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { Timeline } from "@/components/ui/Timeline";
import { KeyValues } from "@/features/lease-requests/ui";
import { isLocale } from "@/i18n/config";
import { date } from "@/lib/format";
import { createCompany, lookupCompany, requestAccess, type AccessState, type CreateState, type LookupState } from "./actions";

const STEPS = ["company", "review"] as const;

/**
 * "Add a company" (canvas "Cég hozzáadása"): tax number → NAV data → display name and declaration → review → create.
 * If the company is already on Keyfly: ask for access (or the state that explains why not).
 */
export function AddCompanyFlow({ homeHref, myName, companyPrefix }: { homeHref: string; myName: string; companyPrefix: string }) {
  const t = useTranslations("companies");
  const lr = useTranslations("leaseRequest");
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : "hu";
  const router = useRouter();
  const id = useId();
  const top = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [lookup, search, searching] = useActionState<LookupState, FormData>(lookupCompany, { status: "idle" });
  const [created, create, creating] = useActionState<CreateState, FormData>(createCompany, { status: "idle" });
  const [access, ask, asking] = useActionState<AccessState, FormData>(requestAccess, { status: "idle" });
  // Edits belong to the company they were made for: a new lookup starts from NAV's name again.
  const key = lookup.status === "found" ? lookup.tax8 : "";
  const [nameEdit, setNameEdit] = useState<{ key: string; value: string } | null>(null);
  const [declared, setDeclared] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: boolean; declaration?: boolean }>({});
  const name = lookup.status === "found" ? (nameEdit?.key === key ? nameEdit.value : lookup.suggestedName) : "";

  const go = (to: number) => {
    setStep(to);
    requestAnimationFrame(() => top.current?.focus());
  };
  const next = () => {
    const e = { name: name.trim().length < 2 || name.trim().length > 200, declaration: declared !== key };
    setErrors(e);
    if (e.name || e.declaration) return;
    go(1);
  };

  if (access.status === "sent") {
    return (
      <div className="flex min-h-dvh flex-col bg-surface sm:bg-paper">
        <FlowHeader title={t("flow.title")} steps={STEPS.map((s) => t(`flow.steps.${s}`))} current={0} homeHref={homeHref} onCancel={() => router.push(homeHref)} labels={headerLabels()} />
        <main className="flex flex-1 justify-center px-5 py-10 sm:py-16">
          <section className="flex w-full max-w-[480px] flex-col gap-5 sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-8">
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-mist text-brand">
              <Icon name="send" size={22} strokeWidth={2} />
            </span>
            <div role="status" className="flex flex-col gap-2">
              <h1 className="font-display text-[22px] leading-7 font-semibold">{t("sent.title")}</h1>
              <p className="text-sm text-muted">{t("sent.text")}</p>
            </div>
            <ButtonLink href={homeHref}>{t("sent.toHome")}</ButtonLink>
          </section>
        </main>
      </div>
    );
  }

  function headerLabels() {
    return {
      progress: lr("flow.progress"),
      stepOf: lr("flow.stepOf", { step: step + 1, total: STEPS.length }),
      done: lr("flow.done"),
      current: lr("flow.current"),
      back: t("back"),
      cancel: lr("flow.cancel"),
      home: lr("flow.home"),
    };
  }

  const exists = lookup.status === "exists";
  const title = step === 1 ? t("review.title") : exists ? t("exists.title") : t("s1Title");
  const lead = step === 1 ? t("review.lead") : exists ? t("exists.lead") : t("s1Lead");
  const taxError = lookup.status === "format" ? t("states.format") : lookup.status === "invalid" ? t("states.invalid") : undefined;
  const createError = created.status === "error" ? t(`errors.${created.error === "invalid" ? "generic" : created.error === "unavailable" ? "generic" : created.error}`) : null;

  const primary =
    step === 1 ? (
      <Button pending={creating} fit formId="kf-create">
        {creating ? t("review.creating") : t("review.create")}
      </Button>
    ) : exists ? (
      <Button pending={asking} fit formId="kf-access">
        {!asking && <Icon name="send" size={16} strokeWidth={2} />}
        {asking ? t("exists.sending") : t("exists.request")}
      </Button>
    ) : lookup.status === "found" ? (
      <button type="button" onClick={next} className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(12_31_25/0.16)] hover:bg-ink-soft sm:h-10 sm:w-auto">
        {t("next")}
      </button>
    ) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface sm:bg-paper">
      <FlowHeader
        title={t("flow.title")}
        steps={STEPS.map((s) => t(`flow.steps.${s}`))}
        current={step}
        homeHref={homeHref}
        onBack={step > 0 ? () => go(0) : undefined}
        onCancel={() => router.push(homeHref)}
        labels={headerLabels()}
      />
      <div className="mx-auto flex w-full max-w-[1036px] flex-1 justify-center gap-8 px-5 pt-6 pb-8 sm:px-8 sm:pt-10 sm:pb-14">
        <div className="flex w-full max-w-[600px] min-w-0 flex-col gap-4">
          <section className="flex flex-col gap-5 sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-8">
            <div ref={top} tabIndex={-1} className="flex flex-col gap-1.5 outline-none">
              <h1 className="font-display text-[20px] leading-[26px] font-semibold sm:text-[22px] sm:leading-7">{title}</h1>
              <p className="text-sm text-muted">{lead}</p>
            </div>

            {step === 0 && (
              <>
                <form action={search} className="flex items-start gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Label htmlFor={`${id}-tax`}>{t("tax")}</Label>
                    <input
                      id={`${id}-tax`}
                      name="tax"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="12345678-2-41"
                      maxLength={20}
                      defaultValue={lookup.status === "exists" ? lookup.taxNumber : undefined}
                      aria-invalid={taxError ? true : undefined}
                      aria-describedby={taxError ? `${id}-tax-error` : undefined}
                      className={INPUT_CLASS}
                    />
                    {taxError && <FieldError id={`${id}-tax-error`} message={taxError} />}
                  </div>
                  <div className="pt-[26px]">
                    <button
                      type="submit"
                      aria-disabled={searching || undefined}
                      onClick={searching ? (e) => e.preventDefault() : undefined}
                      className="inline-flex h-11 items-center gap-2 rounded-lg border border-field bg-surface px-3.5 text-sm font-medium whitespace-nowrap hover:border-ink sm:h-10"
                    >
                      {searching ? (
                        <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
                      ) : (
                        <Icon name="search" size={16} strokeWidth={2} />
                      )}
                      {t("search")}
                    </button>
                  </div>
                </form>

                {lookup.status === "unavailable" && (
                  <Notice kind="warning" icon="clock">
                    {t("states.unavailable")}
                  </Notice>
                )}
                {lookup.status === "member" && (
                  <div className="flex flex-col gap-3">
                    <Notice kind="info" icon="info">
                      {t("states.member", { name: lookup.name })}
                    </Notice>
                    <ButtonLink href={`${companyPrefix}${lookup.slug}`} variant="secondary" fit>
                      {t("states.switchTo")}
                    </ButtonLink>
                  </div>
                )}
                {lookup.status === "requested" && (
                  <Notice kind="info" icon="info">
                    {t("states.requested", { date: date(lookup.requestedAt, locale) })}
                  </Notice>
                )}
                {lookup.status === "inviteOnly" && (
                  <Notice kind="info" icon="info">
                    {t("states.inviteOnly", { name: lookup.name })}
                  </Notice>
                )}

                {lookup.status === "found" && (
                  <>
                    <div className="flex flex-col gap-1 rounded-[10px] border border-line bg-paper px-4 pt-3 pb-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-[13px] font-semibold text-ok-ink">
                          <Icon name="check" size={16} strokeWidth={2.5} />
                          {t("nav.title")}
                        </span>
                        <Tag tone="ok">{t("nav.valid")}</Tag>
                      </div>
                      <KeyValues
                        rows={[
                          [t("nav.legalName"), lookup.taxpayer.legalName],
                          ...(lookup.taxpayer.address ? [[t("nav.address"), lookup.taxpayer.address] as [string, string]] : []),
                          [t("nav.taxNumber"), lookup.taxpayer.taxNumber],
                        ]}
                      />
                    </div>
                    <TextField
                      id={`${id}-name`}
                      label={t("displayName")}
                      hint={t("displayNameHint")}
                      value={name}
                      maxLength={200}
                      onChange={(e) => {
                        setNameEdit({ key, value: e.target.value });
                        if (errors.name) setErrors((x) => ({ ...x, name: false }));
                      }}
                      error={errors.name ? t("errors.name") : undefined}
                    />
                    <Notice kind="info" icon="info">
                      {t("ownerNote")}
                    </Notice>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-5">
                        <input
                          type="checkbox"
                          checked={declared === key}
                          onChange={(e) => {
                            setDeclared(e.target.checked ? key : null);
                            if (errors.declaration) setErrors((x) => ({ ...x, declaration: false }));
                          }}
                          aria-invalid={errors.declaration ? true : undefined}
                          aria-describedby={errors.declaration ? `${id}-decl-error` : undefined}
                          className="mt-0.5 size-4 flex-none accent-ink"
                        />
                        <span>{t("declaration")}</span>
                      </label>
                      {errors.declaration && <FieldError id={`${id}-decl-error`} message={t("errors.declaration")} className="pl-6.5" />}
                    </div>
                  </>
                )}

                {exists && (
                  <form id="kf-access" action={ask} className="flex flex-col gap-4">
                    <input type="hidden" name="accountId" value={lookup.accountId} />
                    <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-paper p-4">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-full bg-brand-deep text-xs font-semibold text-lime">
                          {lookup.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((w) => w[0]?.toLocaleUpperCase("hu"))
                            .join("")}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[15px] font-semibold">{lookup.name}</span>
                          <span className="text-[13px] text-muted">
                            {t("nav.taxNumber")}: {lookup.taxNumber}
                          </span>
                        </span>
                        <Tag tone="info">{t("exists.tag")}</Tag>
                      </div>
                      <p className="text-[13.5px] leading-5 text-ink-soft">{t("exists.text")}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`${id}-msg`}>
                        {t("exists.message")}
                        <Optional>{t("optional")}</Optional>
                      </Label>
                      <textarea
                        id={`${id}-msg`}
                        name="message"
                        rows={3}
                        maxLength={500}
                        placeholder={t("exists.messagePh")}
                        className={`${INPUT_CLASS} h-auto min-h-[88px] py-2.5 leading-5`}
                      />
                    </div>
                    <p className="flex items-start gap-2 text-[12.5px] leading-[18px] text-muted">
                      <Icon name="lock" size={15} className="mt-px flex-none" />
                      {t("exists.privacy")}
                    </p>
                    {access.status === "error" && <Notice kind="error">{t(`errors.${access.error}`)}</Notice>}
                  </form>
                )}
              </>
            )}

            {step === 1 && lookup.status === "found" && (
              <form id="kf-create" action={create} className="flex flex-col gap-4">
                <input type="hidden" name="tax" value={lookup.tax8} />
                <input type="hidden" name="name" value={name.trim()} />
                <input type="hidden" name="declaration" value="on" />
                <div className="flex flex-col">
                  <section className="flex flex-col gap-1 pb-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{t("review.company")}</h2>
                      <button type="button" onClick={() => go(0)} className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-brand hover:underline sm:min-h-8">
                        <Icon name="edit" size={14} strokeWidth={2} />
                        {t("edit")}
                      </button>
                    </div>
                    <KeyValues
                      rows={[
                        [t("nav.legalName"), lookup.taxpayer.legalName],
                        [t("displayName"), name.trim()],
                        ...(lookup.taxpayer.address ? [[t("nav.address"), lookup.taxpayer.address] as [string, string]] : []),
                        [t("nav.taxNumber"), lookup.taxpayer.taxNumber],
                      ]}
                    />
                  </section>
                  <section className="flex flex-col gap-1 border-t border-paper py-4">
                    <h2 className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{t("review.you")}</h2>
                    <p className="text-sm">{t("review.youValue", { name: myName })}</p>
                  </section>
                  <section className="flex flex-col gap-1 border-t border-paper pt-4">
                    <h2 className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{t("review.plan")}</h2>
                    <p className="text-sm">{t("rail.planName")}</p>
                  </section>
                </div>
                {createError && <Notice kind="error">{createError}</Notice>}
              </form>
            )}

            {primary && (
              <div className="hidden items-center justify-between gap-4 border-t border-paper pt-5 sm:flex">
                <button type="button" onClick={step === 1 ? () => go(0) : () => router.push(homeHref)} className="-ml-3 inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-paper">
                  <Icon name="back" size={16} strokeWidth={2} />
                  {t("back")}
                </button>
                {primary}
              </div>
            )}
          </section>
        </div>

        <aside aria-label={t("rail.planTitle")} className="hidden w-[340px] flex-none flex-col gap-3.5 lg:flex">
          {step === 0 ? (
            <>
              <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
                <h2 className="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{t("rail.planTitle")}</h2>
                <p className="text-[15px] font-semibold">{t("rail.planName")}</p>
                <p className="text-[13px] leading-[19px] text-muted">{t("rail.planText")}</p>
              </section>
              <p className="flex items-start gap-2 px-1 text-[13px] leading-[18px] text-ink-soft">
                <Icon name="building" size={16} className="mt-px flex-none text-brand" />
                {t("rail.one")}
              </p>
            </>
          ) : (
            <section className="flex flex-col gap-3.5 rounded-xl border border-line bg-surface p-5">
              <h2 className="text-[15px] leading-5 font-semibold">{t("rail.nextTitle")}</h2>
              <Timeline
                compact
                items={[
                  { state: "todo", title: t("rail.next1"), sub: t("rail.next1Text") },
                  { state: "todo", title: t("rail.next2"), sub: t("rail.next2Text") },
                  { state: "todo", title: t("rail.next3"), sub: t("rail.next3Text") },
                ]}
              />
            </section>
          )}
        </aside>
      </div>
      {primary && <div className="sticky bottom-0 z-10 border-t border-line bg-surface px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:hidden">{primary}</div>}
    </div>
  );
}
