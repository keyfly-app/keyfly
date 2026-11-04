"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/Icon";
import { toast } from "@/components/Toaster";
import { Dialog, DialogActions } from "@/components/ui/Dialog";
import { Button, Optional, TextField, buttonClass } from "@/components/ui/form";
import { MenuPopover } from "@/components/ui/MenuPopover";
import { Tag } from "@/components/ui/Tag";
import { ServiceForm, type ContactOption, type ProviderOption, type ServiceCatalog, type ServiceDraft } from "./ServiceForm";
import { endService, pauseService, resumeService } from "./service-actions";

export type ServiceView = {
  id: string;
  group: "utility" | "other";
  icon: IconName;
  name: string;
  subtitle: string;
  settlement: string;
  tenantPays: boolean;
  network: string | null;
  reading: string | null;
  paused: string | null;
  pausedFrom: string | null;
  identifiers: { label: string; value: string }[];
  meters: { id: string; name: string; sub: string; serial: string; unit: string }[];
  draft: ServiceDraft & { serviceId: string };
};

function CopyValue({ label, value }: { label: string; value: string }) {
  const t = useTranslations("properties.services");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast(t("copied", { label }));
    } catch {
      // Clipboard refused: the value is on screen to select by hand.
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t("copy", { label })}
      className="-my-2 flex size-11 flex-none items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink sm:size-7"
    >
      <Icon name="copy" size={14} strokeWidth={1.9} />
    </button>
  );
}

function ServiceCard({
  s,
  propertyId,
  editable,
  onEdit,
  onPause,
  onEnd,
}: {
  s: ServiceView;
  propertyId: string;
  editable: boolean;
  onEdit: () => void;
  onPause: () => void;
  onEnd: () => void;
}) {
  const t = useTranslations("properties.services");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const resume = () =>
    start(async () => {
      const r = await resumeService(propertyId, s.id);
      if (r.status === "saved") {
        toast(t("resumed", { name: s.name }));
        router.refresh();
      } else toast(t("errors.generic"), "error");
    });
  const body = s.identifiers.length > 0 || s.meters.length > 0 || s.network || s.reading;
  return (
    <li className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:p-5 ${s.paused ? "border-dashed border-field" : "border-line"}`}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`flex size-9 flex-none items-center justify-center rounded-[10px] bg-mist text-brand ${s.paused ? "opacity-60" : ""}`}
        >
          <Icon name={s.icon} size={18} strokeWidth={1.8} />
        </span>
        <div className={`flex min-w-0 flex-1 flex-col ${s.paused ? "opacity-70" : ""}`}>
          <span className="text-[15px] leading-5 font-semibold [overflow-wrap:anywhere]">{s.name}</span>
          {s.subtitle && <span className="text-[13px] text-muted [overflow-wrap:anywhere]">{s.subtitle}</span>}
        </div>
        <span className="flex flex-none items-center gap-1">
          <span className="flex">
            <Tag tone={s.paused ? "warning" : s.tenantPays ? "ok" : "neutral"}>{s.paused ?? s.settlement}</Tag>
          </span>
          {editable && (
            <MenuPopover
              title={s.name}
              closeLabel={t("form.close")}
              align="end"
              width={220}
              trigger={({ ref, open: o, toggle, menuId }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={toggle}
                  aria-haspopup="menu"
                  aria-expanded={o}
                  aria-controls={o ? menuId : undefined}
                  aria-label={t("more", { name: s.name })}
                  className="-my-1.5 -mr-1.5 flex size-11 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink sm:size-9"
                >
                  <Icon name="more" size={18} />
                </button>
              )}
            >
              {!s.paused && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={onPause}
                  className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-paper focus-visible:bg-paper sm:min-h-10"
                >
                  <Icon name="pause" size={16} strokeWidth={1.75} className="flex-none text-muted" />
                  {t("pause")}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={onEdit}
                className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-paper focus-visible:bg-paper sm:min-h-10"
              >
                <Icon name="edit" size={16} strokeWidth={1.75} className="flex-none text-muted" />
                {t("edit")}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={onEnd}
                className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-sm text-danger-ink hover:bg-paper focus-visible:bg-paper sm:min-h-10"
              >
                <Icon name="storage" size={16} strokeWidth={1.75} className="flex-none" />
                {t("end")}
              </button>
            </MenuPopover>
          )}
        </span>
      </div>
      {body && (
        <>
          <button
            type="button"
            onClick={() => setOpen((x) => !x)}
            aria-expanded={open}
            className="-my-1 inline-flex min-h-11 items-center gap-1 self-start text-[13px] font-semibold text-brand sm:hidden"
          >
            {t("showDetails")}
            <Icon name="chevronDown" size={15} strokeWidth={2} className={open ? "rotate-180" : ""} />
          </button>
          <dl className={`${open ? "flex" : "hidden"} flex-col text-[13.5px] sm:flex ${s.paused ? "opacity-70" : ""}`}>
            {s.identifiers.map((i, n) => (
              <div key={`${i.label}-${n}`} className="flex min-h-10 items-center justify-between gap-3 border-t border-paper py-1.5">
                <dt className="min-w-0 text-muted [overflow-wrap:anywhere]">{i.label}</dt>
                <dd className="flex min-w-0 items-center gap-0.5">
                  <span className="min-w-0 truncate font-mono text-[13px] font-medium tracking-[0.02em]">{i.value}</span>
                  <CopyValue label={i.label} value={i.value} />
                </dd>
              </div>
            ))}
            {s.network && (
              <div className="flex min-h-10 items-center justify-between gap-3 border-t border-paper py-1.5">
                <dt className="text-muted">{t("network")}</dt>
                <dd className="text-right font-medium [overflow-wrap:anywhere]">{s.network}</dd>
              </div>
            )}
            {s.meters.map((m) => (
              <div key={m.id} className="flex min-h-10 items-center justify-between gap-3 border-t border-paper py-1.5">
                <dt className="flex min-w-0 items-center gap-2">
                  <Icon name="gauge" size={14} strokeWidth={1.75} className="flex-none text-muted" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {m.name}
                    {m.sub && <span className="text-muted"> · {m.sub}</span>}
                  </span>
                </dt>
                <dd className="flex-none text-right font-mono text-[13px] font-medium">
                  {m.serial || "—"} <span className="font-sans text-muted">{m.unit}</span>
                </dd>
              </div>
            ))}
            {s.reading && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-paper px-3 py-2.5">
                <Icon name="calendar" size={15} strokeWidth={1.75} className="flex-none text-muted" />
                <dt className="text-muted">{t("reading")}</dt>
                <dd className="font-semibold [overflow-wrap:anywhere]">{s.reading}</dd>
              </div>
            )}
          </dl>
        </>
      )}
      {s.paused && editable && (
        <form action={resume}>
          <button type="submit" aria-disabled={pending || undefined} className={`${buttonClass("secondary", true)} w-auto`}>
            <Icon name="play" size={14} strokeWidth={2} />
            {t("resume")}
          </button>
        </form>
      )}
    </li>
  );
}

/**
 * "Szolgáltatások" (canvas "Ingatlan – szolgáltatások", "… – szüneteltetés"): utilities and other services as cards with
 * identifiers (copy), network, meters and the reading schedule; add and edit in a side panel; pause, resume, end.
 */
export function ServicesPanel({
  propertyId,
  editable,
  services,
  catalog,
  providers,
  contacts,
  postalCode,
  openAdd,
}: {
  propertyId: string;
  editable: boolean;
  services: ServiceView[];
  catalog: ServiceCatalog;
  providers: ProviderOption[];
  contacts: ContactOption[];
  postalCode: string;
  openAdd: "utility" | "other" | null;
}) {
  const t = useTranslations("properties.services");
  const router = useRouter();
  const [form, setForm] = useState<{ group: "utility" | "other"; service: ServiceView | null; key: number } | null>(
    editable && openAdd ? { group: openAdd, service: null, key: 0 } : null,
  );
  const [pausing, setPausing] = useState<ServiceView | null>(null);
  const [ending, setEnding] = useState<ServiceView | null>(null);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date());
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState("");
  const [openEnded, setOpenEnded] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pause = () =>
    start(async () => {
      if (!pausing) return;
      const r = await pauseService(propertyId, pausing.id, from, openEnded ? "" : until);
      if (r.status === "saved") {
        toast(t("pausedToast", { name: pausing.name }));
        setPausing(null);
        router.refresh();
      } else setPauseError(r.status === "error" && r.fields ? t(`errors.${Object.values(r.fields)[0] === "dates" ? "dates" : "date"}`) : t("errors.generic"));
    });
  const end = () =>
    start(async () => {
      if (!ending) return;
      const r = await endService(propertyId, ending.id);
      if (r.status === "saved") {
        toast(t("ended", { name: ending.name }));
        setEnding(null);
        router.refresh();
      } else toast(t("errors.generic"), "error");
    });

  const group = (g: "utility" | "other") => {
    const list = services.filter((s) => s.group === g);
    return (
      <section aria-labelledby={`svc-${g}`} className="flex flex-col gap-3">
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
          <h2 id={`svc-${g}`} className="flex items-baseline gap-2 text-[17px] leading-6 font-semibold">
            {t(g === "utility" ? "utilities" : "others")}
            {list.length > 0 && <span className="text-sm font-medium text-muted tabular-nums">{list.length}</span>}
          </h2>
          {editable && (
            <button type="button" onClick={() => setForm({ group: g, service: null, key: Date.now() })} className={`${buttonClass("secondary", true)} w-auto`}>
              <Icon name="plus" size={16} strokeWidth={2} />
              {t(g === "utility" ? "addUtility" : "addOther")}
            </button>
          )}
        </div>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-field bg-surface p-5 text-sm text-muted">
            {t(g === "utility" ? "emptyUtilities" : "emptyOthers")}
          </p>
        ) : (
          <ul className="grid items-start gap-3 lg:grid-cols-2">
            {list.map((s) => (
              <ServiceCard
                key={s.id}
                s={s}
                propertyId={propertyId}
                editable={editable}
                onEdit={() => setForm({ group: g, service: s, key: Date.now() })}
                onPause={() => {
                  setPausing(s);
                  setFrom(today);
                  setUntil("");
                  setOpenEnded(false);
                  setPauseError(null);
                }}
                onEnd={() => setEnding(s)}
              />
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {group("utility")}
      {group("other")}
      {form && (
        <ServiceForm
          key={form.key}
          open
          onClose={() => setForm(null)}
          propertyId={propertyId}
          group={form.group}
          initial={form.service?.draft ?? null}
          name={form.service?.name ?? ""}
          catalog={catalog}
          providers={providers}
          contacts={contacts}
          postalCode={postalCode}
        />
      )}
      <Dialog
        open={Boolean(pausing)}
        onClose={() => setPausing(null)}
        title={pausing ? t("pauseDialog.title", { name: pausing.name }) : ""}
        closeLabel={t("form.close")}
        wide
      >
        <form action={pause} className="flex flex-col gap-4">
          {pauseError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13.5px] text-danger-ink">
              {pauseError}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField id="pause-from" type="date" label={t("pauseDialog.from")} value={from} max="9999-12-31" onChange={(e) => setFrom(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pause-until" className="flex items-center gap-1.5 text-[13px] font-medium">
                {t("pauseDialog.until")} <Optional>{t("pauseDialog.optional")}</Optional>
              </label>
              <input
                id="pause-until"
                type="date"
                value={openEnded ? "" : until}
                min={from || undefined}
                max="9999-12-31"
                disabled={openEnded}
                onChange={(e) => setUntil(e.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-field bg-surface px-3 text-base disabled:opacity-50 sm:h-10 sm:text-sm"
              />
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={openEnded} onChange={(e) => setOpenEnded(e.target.checked)} className="size-5 accent-ink" />
            {t("pauseDialog.open")}
          </label>
          <p className="text-[13px] text-muted">{t("pauseDialog.hint")}</p>
          <DialogActions>
            <button type="button" onClick={() => setPausing(null)} className={buttonClass("secondary")}>
              {t("pauseDialog.cancel")}
            </button>
            <Button pending={pending}>
              <Icon name="pause" size={14} strokeWidth={2} />
              {t("pauseDialog.confirm")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(ending)}
        onClose={() => setEnding(null)}
        title={ending ? t("endDialog.title", { name: ending.name }) : ""}
        description={t("endDialog.text")}
        closeLabel={t("form.close")}
      >
        <DialogActions>
          <button type="button" onClick={() => setEnding(null)} className={buttonClass("secondary")} data-autofocus>
            {t("endDialog.cancel")}
          </button>
          <form action={end}>
            <Button variant="danger" pending={pending}>
              {t("endDialog.confirm")}
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </div>
  );
}
