"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Tag } from "@/components/ui/Tag";
import { Button, FieldError, INPUT_CLASS, Label, Optional } from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AddressSearch } from "@/features/address-search/AddressSearch";
import type { FoundAddress } from "@/features/address-search/places";
import { pickedStreet } from "@/features/address-search/street";
import { ALL_COUNTRIES, splitPhone, type CountryCode } from "@/lib/phone";
import { refreshFromNav, updateCompanyDetails, type DetailsField, type DetailsState, type Office } from "./actions";

export type CompanyDetails = {
  name: string;
  legal_name: string | null;
  tax_number: string | null;
  eu_vat_number: string | null;
  company_reg_number: string | null;
  office: Office | null;
  mailing: Office | null;
  contact_email: string | null;
  contact_phone: string | null;
  nav_verified_at: string | null;
};

type Values = {
  name: string;
  legalName: string;
  taxEnd: string;
  euVat: string;
  regNumber: string;
  officePostal: string;
  officeCity: string;
  officeStreet: string;
  sameAsOffice: boolean;
  mailPostal: string;
  mailCity: string;
  mailStreet: string;
  email: string;
  phone: string;
  phoneCountry: CountryCode;
};

const toValues = (c: CompanyDetails): Values => ({
  name: c.name,
  legalName: c.legal_name ?? "",
  taxEnd: c.tax_number?.slice(9) ?? "",
  euVat: c.eu_vat_number ?? "",
  regNumber: c.company_reg_number ?? "",
  officePostal: c.office?.postal_code ?? "",
  officeCity: c.office?.city ?? "",
  officeStreet: c.office?.street ?? "",
  sameAsOffice: !c.mailing,
  mailPostal: c.mailing?.postal_code ?? "",
  mailCity: c.mailing?.city ?? "",
  mailStreet: c.mailing?.street ?? "",
  email: c.contact_email ?? "",
  ...(({ country, national }) => ({ phoneCountry: country, phone: national }))(splitPhone(c.contact_phone)),
});

const FORMAT_KEY: Partial<Record<DetailsField, string>> = {
  taxEnd: "taxEnd",
  euVat: "euVat",
  regNumber: "regNumber",
  officePostal: "postalCode",
  mailPostal: "postalCode",
  email: "email",
  phone: "phone",
};

function Card({ id, title, extra, children }: { id: string; title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5 sm:px-6">
        <h2 id={id} className="text-[15px] font-semibold">
          {title}
        </h2>
        {extra}
      </div>
      <div className="flex flex-col gap-4 px-5 pt-3.5 pb-5 sm:px-6">{children}</div>
    </section>
  );
}

/**
 * Cégadatok (canvas "Cégadatok – szerkeszthető", "… NAV-frissítés után", "… csak olvasható"): name and identifiers,
 * registered office, mailing address, contact. "Frissítés a NAV-ból" fills the form with NAV's current data; Save stores
 * it. Only the last three digits of the tax number can change. Unsaved changes keep a save bar on screen.
 */
export function CompanyDetailsForm({ accountId, company, manage }: { accountId: string; company: CompanyDetails; manage: boolean }) {
  const t = useTranslations("companies.details");
  const c = useTranslations("companies");
  const id = useId();
  const [saved, setSaved] = useState(() => toValues(company));
  const [values, setValues] = useState(saved);
  const [refreshing, startRefresh] = useTransition();
  const [state, action, pending] = useActionState<DetailsState, FormData>(async (prev, form) => {
    const next = await updateCompanyDetails(prev, form);
    if (next.status === "saved") {
      setSaved(values);
      toast(t("saved"));
    } else if (next.status === "error") toast(t(`errors.${next.error}`), "error");
    return next;
  }, { status: "idle" });
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const formRef = useRef<HTMLFormElement>(null);
  // After a failed save, the first field to fix gets the focus.
  useEffect(() => {
    if (state.status === "invalid") formRef.current?.querySelector<HTMLInputElement>("[aria-invalid=true]")?.focus();
  }, [state]);
  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const errorOf = (key: DetailsField) => {
    if (state.status !== "invalid" || !state.fields[key]) return undefined;
    if (state.fields[key] === "required") return t("errors.required");
    return t(`errors.${FORMAT_KEY[key] ?? "generic"}`);
  };

  const refresh = () =>
    startRefresh(async () => {
      const nav = await refreshFromNav(accountId);
      if (nav.status !== "found") return toast(t(nav.status === "invalid" ? "navInvalid" : nav.status === "unavailable" ? "navUnavailable" : "errors.notAllowed"), "error");
      setValues((v) => ({
        ...v,
        legalName: nav.legalName,
        taxEnd: nav.taxEnd ?? v.taxEnd,
        officePostal: nav.office?.postal_code ?? v.officePostal,
        officeCity: nav.office?.city ?? v.officeCity,
        officeStreet: nav.office?.street ?? v.officeStreet,
      }));
      toast(t("navLoaded"));
    });

  const field = (key: DetailsField & keyof Values, label: string, opts: { optional?: boolean; autoComplete?: string; inputMode?: "numeric" | "email" | "tel"; type?: string; placeholder?: string; maxLength?: number } = {}) => {
    const err = errorOf(key);
    const fid = `${id}-${key}`;
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={fid}>
          {label}
          {opts.optional && <Optional>{c("optional")}</Optional>}
        </Label>
        <input
          id={fid}
          name={key}
          value={values[key] as string}
          onChange={set(key)}
          readOnly={!manage}
          type={opts.type ?? "text"}
          inputMode={opts.inputMode}
          autoComplete={opts.autoComplete ?? "off"}
          placeholder={opts.placeholder}
          maxLength={opts.maxLength}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${fid}-error` : undefined}
          className={`${INPUT_CLASS} ${manage ? "" : "bg-paper text-ink-soft"}`}
        />
        {err && <FieldError id={`${fid}-error`} message={err} />}
      </div>
    );
  };

  // Canvas "Cégadatok – székhely keresése": the Google search fills the fields, which stay editable.
  const pick = (prefix: "office" | "mail") => (a: FoundAddress) =>
    setValues((v) => ({ ...v, [`${prefix}Postal`]: a.postalCode, [`${prefix}City`]: a.city, [`${prefix}Street`]: pickedStreet(a) }));
  const focusFirst = (prefix: "office" | "mail") => () => document.getElementById(`${id}-${prefix}Postal`)?.focus();
  const address = (prefix: "office" | "mail", group: string) => (
    <>
      {manage && <AddressSearch label={t("search")} keepPicked onPick={pick(prefix)} onManual={focusFirst(prefix)} onUnavailable={() => undefined} />}
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[8.75rem_minmax(0,1fr)] sm:gap-4">
        {field(`${prefix}Postal`, t("postalCode"), { autoComplete: `section-${group} postal-code`, inputMode: "numeric", maxLength: 4 })}
        {field(`${prefix}City`, t("city"), { autoComplete: `section-${group} address-level2`, maxLength: 100 })}
      </div>
      {field(`${prefix}Street`, t("street"), { autoComplete: `section-${group} address-line1`, maxLength: 200 })}
    </>
  );

  const taxErr = errorOf("taxEnd");
  const tax8 = company.tax_number?.slice(0, 8) ?? "";

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-end gap-4">
          <h2 className="sr-only">{t("title")}</h2>
          {manage && (
            <button
              type="button"
              onClick={refresh}
              aria-disabled={refreshing || undefined}
              aria-label={t("navRefresh")}
              className="inline-flex size-11 flex-none items-center justify-center gap-2 rounded-lg border border-field bg-surface text-sm font-medium hover:border-ink aria-disabled:cursor-progress aria-disabled:opacity-80 sm:size-auto sm:h-10 sm:px-4"
            >
              <Icon name="refresh" size={16} strokeWidth={2} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} />
              <span className="hidden sm:inline">{t("navRefresh")}</span>
            </button>
          )}
        </div>
      </div>

      <form ref={formRef} action={action} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="accountId" value={accountId} />
        <Card
          id={`${id}-identity`}
          title={t("identity")}
          extra={
            company.nav_verified_at && (
              <Tag tone="ok">
                <Icon name="check" size={12} strokeWidth={2.5} className="mr-1" />
                {t("verified")}
              </Tag>
            )
          }
        >
          {field("name", c("displayName"), { autoComplete: "organization", maxLength: 200 })}
          {field("legalName", t("legalName"), { maxLength: 300 })}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor={`${id}-taxEnd`}>{t("taxNumber")}</Label>
              <div
                className={`flex h-11 min-w-0 items-stretch overflow-hidden rounded-lg border sm:h-10 ${taxErr ? "border-danger-ink shadow-[0_0_0_3px_rgb(138_28_28/0.1)]" : "border-field focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgb(14_90_67/0.16)]"} ${manage ? "bg-surface" : "bg-paper"}`}
              >
                <span className="flex flex-none items-center gap-2 border-r border-line bg-paper px-3 text-base text-muted tabular-nums sm:text-sm">
                  <Icon name="lock" size={13} />
                  <span aria-hidden="true">{tax8}</span>
                  <span className="sr-only">{t("taxFixed", { digits: tax8.split("").join(" ") })}</span>
                </span>
                <span aria-hidden="true" className="flex items-center pl-3 text-muted">
                  –
                </span>
                <input
                  id={`${id}-taxEnd`}
                  name="taxEnd"
                  value={values.taxEnd}
                  onChange={set("taxEnd")}
                  readOnly={!manage}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="2-41"
                  aria-label={t("taxEnd")}
                  aria-invalid={taxErr ? true : undefined}
                  aria-describedby={taxErr ? `${id}-taxEnd-error` : undefined}
                  className={`min-w-0 flex-1 bg-transparent px-2 text-base tabular-nums placeholder:text-muted/70 focus-visible:outline-none sm:text-sm ${manage ? "text-ink" : "text-ink-soft"}`}
                />
              </div>
              {taxErr && <FieldError id={`${id}-taxEnd-error`} message={taxErr} />}
            </div>
            {field("euVat", t("euVat"), { optional: true, placeholder: `HU${tax8 || "12345678"}`, maxLength: 12 })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{field("regNumber", t("regNumber"), { optional: true, placeholder: "01-09-123456", maxLength: 14 })}</div>
        </Card>

        <Card id={`${id}-office`} title={t("office")}>
          {address("office", "office")}
        </Card>

        <Card id={`${id}-mailing`} title={t("mailing")}>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm sm:min-h-6">
            <input type="checkbox" name="sameAsOffice" checked={values.sameAsOffice} onChange={set("sameAsOffice")} disabled={!manage} className="size-[18px] flex-none accent-ink" />
            {t("sameAsOffice")}
          </label>
          {!values.sameAsOffice && address("mail", "mailing")}
        </Card>

        <Card id={`${id}-contact`} title={t("contact")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("email", t("email"), { optional: true, type: "email", inputMode: "email", autoComplete: "email", maxLength: 254 })}
            <PhoneInput
              id={`${id}-phone`}
              name="phone"
              label={t("phone")}
              optional={c("optional")}
              countries={ALL_COUNTRIES}
              country={values.phoneCountry}
              value={values.phone}
              onChange={(phoneCountry, phone) => setValues((v) => ({ ...v, phoneCountry, phone }))}
              readOnly={!manage}
              error={errorOf("phone")}
            />
          </div>
        </Card>

        {manage && (
          <div
            className={`z-10 flex items-center gap-3 max-sm:sticky max-sm:bottom-(--app-bottom) max-sm:-mx-4 max-sm:border-t max-sm:border-line max-sm:bg-surface max-sm:px-4 max-sm:pt-3 max-sm:pb-4 ${dirty ? "sm:sticky sm:bottom-[calc(var(--app-bottom)+1rem)] sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:py-3 sm:pr-3 sm:pl-5 sm:shadow-[0_16px_40px_-16px_rgb(12_31_25/0.3)]" : "sm:justify-end"}`}
          >
            {dirty && (
              <p role="status" className="hidden items-center gap-2.5 text-sm font-medium sm:flex">
                <span aria-hidden="true" className="size-2 rounded-full bg-warning-ink" />
                {t("unsaved")}
              </p>
            )}
            <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
              {dirty && (
                <button type="button" onClick={() => setValues(saved)} className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-field bg-surface px-4 text-sm font-medium hover:border-ink sm:h-10 sm:flex-none">
                  {t("discard")}
                </button>
              )}
              <div className="flex-1 sm:flex-none">
                <Button pending={pending} fit>
                  {t("save")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </>
  );
}
