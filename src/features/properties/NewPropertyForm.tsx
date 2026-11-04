"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { Icon } from "@/components/Icon";
import { Button, Notice, TextField, buttonClass } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import { offered, type CatalogOption } from "@/features/catalog/types";
import { parseFloor } from "@/features/lease-requests/validate";
import { streetLine } from "@/lib/address";
import { createProperty, type SaveState } from "./actions";
import { AddressFields, EMPTY_ADDRESS, type AddressValues } from "./AddressFields";
import { addressLine } from "./format";
import { kindIcon, kindLabel } from "./kinds";
import { TypeTiles } from "./TypeTiles";

/**
 * "Új ingatlan" (canvas "Új ingatlan", "… – Egyéb", "… – címkereső", mobile "Új ingatlan – mobil"): address, type and an
 * optional name and own ID on one page; a live preview on the right from 1024 px, a sticky action bar on phones.
 */
export function NewPropertyForm({ accountId, types, listHref }: { accountId: string; types: CatalogOption[]; listHref: string }) {
  const t = useTranslations("properties.new");
  const lr = useTranslations("leaseRequest");
  const pt = useTranslations("properties");
  const id = useId();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [address, setAddress] = useState<AddressValues>(EMPTY_ADDRESS);
  const [kind, setKind] = useState("");
  const [otherLabel, setOtherLabel] = useState("");
  const [label, setLabel] = useState("");
  const [ownRef, setOwnRef] = useState("");
  // Fields edited since the last answer from the server no longer show its error.
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [state, action, pending] = useActionState<SaveState, FormData>(
    async (prev, data) => {
      const next = await createProperty(prev, data);
      setCleared(new Set());
      return next;
    },
    { status: "idle" },
  );
  const fields = state.status === "error" ? (state.fields ?? {}) : {};
  useEffect(() => {
    if (state.status === "error") requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
  }, [state]);
  const problem = (key: string) => (cleared.has(key) ? undefined : fields[key]);
  const addressError = (key: keyof AddressValues) => {
    const p = problem(key);
    return p ? lr(`errors.${p === "postalCode" ? "postalCode" : "required"}`) : undefined;
  };
  const touch = (key: string) => setCleared((c) => new Set(c).add(key));

  const options = offered(types);
  const { floorType, floorNumber } = parseFloor(address.floor);
  const parts = { ...address, floorType: floorType as never, floorNumber };
  const hasStreet = Boolean(address.streetName && address.houseNumber);
  const street = hasStreet ? streetLine(parts) : "";
  const errorCount = Object.keys(fields).filter((k) => !cleared.has(k)).length;
  const cancel = () => router.push(listHref);

  const actions = (
    <>
      <Button pending={pending} fit>
        {t("submit")}
      </Button>
      <button type="button" onClick={cancel} className={buttonClass("secondary", true)}>
        {t("cancel")}
      </button>
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <FlowHeader
        title={t("title")}
        steps={[]}
        current={0}
        homeHref={listHref}
        onCancel={cancel}
        labels={{
          progress: "",
          stepOf: "",
          done: "",
          current: "",
          back: t("cancel"),
          cancel: t("cancel"),
          home: t("cancel"),
        }}
      />
      <form
        ref={form}
        action={action}
        noValidate
        className="mx-auto grid w-full max-w-[1000px] flex-1 items-start gap-5 px-4 pt-5 pb-28 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:pt-8 lg:pb-12"
      >
        <input type="hidden" name="accountId" value={accountId} />
        <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-5 sm:p-7">
          {state.status === "error" && state.error && <Notice kind="error">{t(`errors.${state.error === "notAllowed" ? "notAllowed" : "generic"}`)}</Notice>}
          {errorCount > 1 && <Notice kind="error">{t("errors.summary", { count: errorCount })}</Notice>}
          <AddressFields
            values={address}
            onChange={(next) => {
              for (const k of Object.keys(next) as (keyof AddressValues)[]) if (next[k] !== address[k]) touch(k);
              setAddress(next);
            }}
            errors={{
              postalCode: addressError("postalCode"),
              city: addressError("city"),
              streetName: addressError("streetName"),
              streetType: addressError("streetType"),
              houseNumber: addressError("houseNumber"),
            }}
          />
          <div className="h-px bg-line" />
          <TypeTiles
            legend={t("type")}
            options={options}
            value={kind}
            onChange={(k) => {
              setKind(k);
              touch("kind");
            }}
            otherLabel={otherLabel}
            onOtherLabel={(v) => {
              setOtherLabel(v);
              touch("otherLabel");
            }}
            labels={{
              other: t("otherLabel"),
              otherPlaceholder: t("otherPlaceholder"),
            }}
            error={problem("kind") ? t("errors.kind") : undefined}
            otherError={problem("otherLabel") ? t("errors.otherLabel") : undefined}
          />
          <div className="h-px bg-line" />
          <section aria-labelledby={`${id}-naming`} className="flex flex-col gap-3">
            <h2 id={`${id}-naming`} className="text-[15px] leading-5 font-semibold">
              {t("naming")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
              <TextField
                id={`${id}-name`}
                name="label"
                label={t("name")}
                optional={t("optional")}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={street || undefined}
                maxLength={120}
              />
              <TextField
                id={`${id}-ref`}
                name="ownRef"
                label={t("ownRef")}
                optional={t("optional")}
                value={ownRef}
                onChange={(e) => {
                  setOwnRef(e.target.value);
                  touch("ownRef");
                }}
                placeholder={t("ownRefPlaceholder")}
                maxLength={30}
                error={problem("ownRef") ? t("errors.ownRefTaken") : undefined}
              />
            </div>
          </section>
          <div className="hidden gap-2 sm:flex">{actions}</div>
        </div>

        <aside aria-label={t("preview")} className="hidden rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-3">
          <span className="text-[13px] font-medium text-muted">{t("preview")}</span>
          {hasStreet || kind ? (
            <>
              <span className="flex items-start gap-3">
                <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-lg bg-mist text-brand">
                  <Icon name={kindIcon(types, kind)} size={20} strokeWidth={1.75} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] leading-5 font-semibold [overflow-wrap:anywhere]">{label.trim() || street || "–"}</span>
                  {hasStreet && address.postalCode && (
                    <span className="text-[12.5px] leading-[17px] text-muted [overflow-wrap:anywhere]">{addressLine(parts)}</span>
                  )}
                </span>
              </span>
              {kind && (
                <span className="flex flex-wrap items-center gap-2">
                  <Tag tone="neutral">{kindLabel(types, kind, otherLabel.trim() || null)}</Tag>
                  {ownRef.trim() && (
                    <span className="text-[12.5px] text-muted">
                      {pt("ownRef")} <span className="font-medium text-ink">{ownRef.trim()}</span>
                    </span>
                  )}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-muted">{t("previewEmpty")}</span>
          )}
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:hidden">
          <Button pending={pending}>{t("submit")}</Button>
        </div>
      </form>
    </div>
  );
}
