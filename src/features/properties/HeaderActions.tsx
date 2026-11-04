"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Notice, TextField, buttonClass } from "@/components/ui/form";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { archiveProperty, copyProperty, type SaveState } from "./actions";
import { AddressFields, type AddressValues } from "./AddressFields";

/** The Keyfly ID with a copy button next to it. */
export function CopyCode({ code }: { code: string }) {
  const t = useTranslations("properties.detail");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast(t("copied", { code }));
    } catch {
      // Clipboard refused (e.g. an insecure context): the ID is on screen to select by hand.
    }
  };
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="font-mono text-[12.5px] font-semibold tracking-[0.04em] text-ink">{code}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={t("copyId")}
        className="flex size-11 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink sm:size-7"
      >
        <Icon name="copy" size={14} strokeWidth={1.9} />
      </button>
    </span>
  );
}

/** The ⋯ menu: archive, behind a confirm dialog; then back to the list. */
export function PropertyMenu({ propertyId, accountId, listHref, copy }: { propertyId: string; accountId: string; listHref: string; copy: CopySource }) {
  const router = useRouter();
  const t = useTranslations("properties.detail");
  const [confirm, setConfirm] = useState(false);
  const [copying, setCopying] = useState(0);
  const [error, setError] = useState<"hasLease" | "error" | null>(null);
  const [pending, start] = useTransition();
  const archive = () =>
    start(async () => {
      const result = await archiveProperty(propertyId, accountId);
      if (result.status === "error") return setError(result.error === "hasLease" ? "hasLease" : "error");
      toast(t("archive.done"));
      router.push(listHref);
    });
  return (
    <>
      <MenuPopover
        title={t("more")}
        closeLabel={t("close")}
        align="end"
        width={240}
        trigger={({ ref, open, toggle, menuId }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={t("more")}
            className="flex size-11 flex-none items-center justify-center rounded-lg border border-field bg-surface text-ink hover:border-ink sm:size-10"
          >
            <Icon name="more" size={18} />
          </button>
        )}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => setCopying(Date.now())}
          className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-paper focus-visible:bg-paper sm:min-h-10"
        >
          <Icon name="copy" size={17} strokeWidth={1.75} className="flex-none text-muted" />
          {t("copy.menu")}
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setError(null);
            setConfirm(true);
          }}
          className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-paper focus-visible:bg-paper sm:min-h-10"
        >
          <Icon name="storage" size={17} strokeWidth={1.75} className="flex-none text-muted" />
          {t("archive.menu")}
        </button>
      </MenuPopover>
      {copying > 0 && <CopyDialog key={copying} source={copy} onClose={() => setCopying(0)} />}
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={t("archive.title")} description={t("archive.text")} closeLabel={t("close")}>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13.5px] text-danger-ink">
            {t(error === "hasLease" ? "archive.hasLease" : "archive.error")}
          </p>
        )}
        <DialogActions>
          <button type="button" onClick={() => setConfirm(false)} className={buttonClass("secondary")} data-autofocus>
            {t("archive.cancel")}
          </button>
          <form action={archive}>
            <Button variant="danger" pending={pending}>
              {t("archive.confirm")}
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** Says "Felvetted az ingatlant." once after the create page sent here (?created=1), then tidies the address. */
export function CreatedToast() {
  const t = useTranslations("properties.new");
  useEffect(() => {
    toast(t("created"));
    const url = new URL(window.location.href);
    url.searchParams.delete("created");
    window.history.replaceState(window.history.state, "", url);
  }, [t]);
  return null;
}

export type CopySource = { id: string; name: string; address: AddressValues };

/** "Ingatlan másolása" (canvas): the same building with a new unit, name and ID; choose what comes along. */
function CopyDialog({ source, onClose }: { source: CopySource; onClose: () => void }) {
  const t = useTranslations("properties.detail");
  const lr = useTranslations("leaseRequest.errors");
  const id = useId();
  const [address, setAddress] = useState<AddressValues>({ ...source.address, floor: "", door: "" });
  const [label, setLabel] = useState("");
  const [ownRef, setOwnRef] = useState("");
  const [take, setTake] = useState({ features: true, services: true, contacts: true, management: false, photos: false });
  const [state, setState] = useState<SaveState>({ status: "idle" });
  const [pending, start] = useTransition();
  const f = state.status === "error" ? (state.fields ?? {}) : {};
  const err = (k: keyof AddressValues) => (f[k] ? lr(f[k] === "postalCode" ? "postalCode" : "required") : undefined);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      // Success moves on to the copy's page.
      const r = await copyProperty({ sourceId: source.id, address, label, ownRef, ...take });
      setState(r);
    });
  };
  const items = [
    ["features", t("copy.features"), t("copy.featuresSub")],
    ["services", t("copy.services"), t("copy.servicesSub")],
    ["contacts", t("copy.contacts"), t("copy.contactsSub")],
    ["management", t("copy.management"), ""],
    ["photos", t("copy.photos"), ""],
  ] as const;
  return (
    <Dialog open onClose={onClose} title={t("copy.title")} description={t("copy.base", { name: source.name })} closeLabel={t("close")} wide>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {state.status === "error" && state.error && <Notice kind="error">{t(`copy.errors.${state.error === "notAllowed" ? "notAllowed" : "generic"}`)}</Notice>}
        <AddressFields
          values={address}
          onChange={setAddress}
          initial="picked"
          errors={{
            postalCode: err("postalCode"),
            city: err("city"),
            streetName: err("streetName"),
            streetType: err("streetType"),
            houseNumber: err("houseNumber"),
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <TextField
            id={`${id}-name`}
            label={t("copy.name")}
            optional={t("copy.optional")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={120}
          />
          <TextField
            id={`${id}-ref`}
            label={t("copy.ownRef")}
            optional={t("copy.optional")}
            value={ownRef}
            onChange={(e) => setOwnRef(e.target.value)}
            maxLength={30}
            error={f.ownRef ? t("copy.errors.ownRefTaken") : undefined}
          />
        </div>
        <fieldset className="flex flex-col">
          <legend className="mb-1 text-[13px] font-medium">{t("copy.take")}</legend>
          {items.map(([key, title, sub]) => (
            <label key={key} className="flex min-h-11 cursor-pointer items-start gap-3 border-b border-paper py-2.5 last:border-b-0">
              <input
                type="checkbox"
                checked={take[key]}
                onChange={(e) => setTake((x) => ({ ...x, [key]: e.target.checked }))}
                className="mt-0.5 size-5 flex-none accent-ink"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{title}</span>
                {sub && <span className="text-[12.5px] text-muted">{sub}</span>}
              </span>
            </label>
          ))}
        </fieldset>
        <DialogActions>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>
            {t("copy.cancel")}
          </button>
          <Button pending={pending}>
            <Icon name="copy" size={15} strokeWidth={2} />
            {t("copy.submit")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
