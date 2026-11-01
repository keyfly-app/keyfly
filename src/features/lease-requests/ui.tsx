import { Icon } from "@/components/Icon";
import { FieldError, FieldHint, INPUT_CLASS, Label, Optional } from "@/components/ui/form";
import { Tag, type TagTone } from "@/components/ui/Tag";
import type { Enums } from "@/lib/supabase/database.types";

/** Small building blocks of the lease request screens (approved design: canvas "A bérlő hívja meg a bérbeadót"). */

/** Upper bound for date inputs: keeps browsers from accepting five- or six-digit years while typing. */
export const LATEST_DATE = "9999-12-31";


/** Two-way switch (radio group) in the app's segmented style. */
export function Segmented<T extends string>({
  name,
  legend,
  showLegend = false,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  showLegend?: boolean;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={showLegend ? "mb-1.5 text-[13px] font-medium" : "sr-only"}>{legend}</legend>
      <div className="flex rounded-lg bg-paper p-0.5">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md text-[13px] font-medium text-muted has-checked:bg-surface has-checked:text-ink has-checked:shadow-[0_1px_2px_rgb(12_31_25/0.12)] has-focus-visible:outline-3 has-focus-visible:outline-brand sm:min-h-9"
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Amount in forints with the currency after the number; an optional note (e.g. "changed") below. */
export function MoneyField({
  id,
  label,
  value,
  currency,
  onChange,
  onBlur,
  error,
  note,
  tip,
  hint,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  currency: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  note?: string;
  tip?: React.ReactNode;
  hint?: string;
  optional?: string;
}) {
  const described = [hint && `${id}-hint`, error && `${id}-error`, note && `${id}-note`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        <Optional>{optional}</Optional>
        {tip}
      </Label>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          className={`${INPUT_CLASS} pr-14`}
        />
        <span aria-hidden="true" className="pointer-events-none absolute top-0 right-3 flex h-11 items-center text-base text-muted sm:h-10 sm:text-sm">
          {currency}
        </span>
      </div>
      {hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
      {error && <FieldError id={`${id}-error`} message={error} />}
      {note && <ChangeNote id={`${id}-note`}>{note}</ChangeNote>}
    </div>
  );
}

/** "Changed · the tenant entered …" under a field the landlord edited. */
export function ChangeNote({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-[13px] font-semibold text-warning-ink">
      <span aria-hidden="true" className="mt-1.5 size-1.5 flex-none rounded-full bg-warning-ink" />
      <span>{children}</span>
    </p>
  );
}

export const STATUS_TONE: Record<Enums<"lease_request_status"> | "expired", TagTone> = {
  pending_landlord: "warning",
  expired: "danger",
  pending_tenant: "warning",
  confirmed: "ok",
  declined: "danger",
  cancelled: "neutral",
};

/** Lease request status tag. */
export function Chip({ tone, children }: { tone: TagTone; children: React.ReactNode }) {
  return <Tag tone={tone}>{children}</Tag>;
}

/** Label / value list in a bordered card. */
export function DetailRows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="rounded-xl border border-line bg-surface px-4 py-1">
      {rows.map(([k, v], i) => (
        <div key={k} className={`flex gap-3 py-2.75 text-sm ${i ? "border-t border-line" : ""}`}>
          <dt className="w-32 flex-none text-muted">{k}</dt>
          <dd className="min-w-0 font-medium tabular-nums [overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Old value struck through, new value, and a chip – for the tenant's review of changed terms. */
export function Changed({ before, after, label }: { before?: string; after: string; label: string }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {before && <del className="font-normal text-muted">{before}</del>}
      <ins className="font-semibold no-underline">{after}</ins>
      <Chip tone="info">{label}</Chip>
    </span>
  );
}

/** Label / value pairs without a frame (inside a card): side by side from 640 px, stacked on phones. */
export function KeyValues({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="flex flex-col text-sm">
      {rows.map(([k, v], i) => (
        <div key={k} className={`flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4 ${i ? "border-t border-paper" : ""}`}>
          <dt className="flex-none text-[12.5px] text-muted sm:text-sm">{k}</dt>
          <dd className="min-w-0 font-medium tabular-nums [overflow-wrap:anywhere] sm:text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export type MiniState = "done" | "now" | "todo";

/** Three-step progress inside a card ("Elküldve – Bérbeadó – Rögzítve"). */
export function MiniSteps({ items, label }: { items: [MiniState, string][]; label: string }) {
  return (
    <ol aria-label={label} className="flex items-center gap-2">
      {items.map(([state, name], i) => (
        <li key={name} className={`flex items-center gap-2 ${i < items.length - 1 ? "flex-1" : ""}`} aria-current={state === "now" ? "step" : undefined}>
          <span className={`flex items-center gap-1.5 text-[12.5px] whitespace-nowrap ${state === "todo" ? "font-medium text-muted" : state === "now" ? "font-semibold" : "font-medium"}`}>
            <span
              aria-hidden="true"
              className={`flex size-4 flex-none items-center justify-center rounded-full ${state === "done" ? "bg-ink text-white" : state === "now" ? "border-[1.5px] border-warning-ink bg-warning-soft" : "border-[1.5px] border-field"}`}
            >
              {state === "done" && <Icon name="check" size={10} strokeWidth={3} />}
            </span>
            {name}
          </span>
          {i < items.length - 1 && <span aria-hidden="true" className={`h-px min-w-3 flex-1 ${state === "done" ? "bg-ink" : "bg-field"}`} />}
        </li>
      ))}
    </ol>
  );
}

/** "A bérbeadódnak díjmentes." and "Csak a bérbeadóddal osztjuk meg." under the flow's rail. */
export function TrustLines({ lines }: { lines: [("shield" | "lock"), string][] }) {
  return (
    <ul className="flex flex-col gap-2.5 px-1">
      {lines.map(([icon, text]) => (
        <li key={text} className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
          <Icon name={icon} size={16} className="flex-none text-brand" />
          {text}
        </li>
      ))}
    </ul>
  );
}

/** Dark "Keyfly guarantee" teaser (coming soon) beside a recorded lease and on the home screen. */
export function GuaranteeCard({ title, text }: { title: string; text: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-brand-deep p-5 text-white">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex size-[26px] items-center justify-center rounded-[7px] bg-lime text-brand-deep">
          <Icon name="shield" size={15} strokeWidth={2} />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <p className="text-[13.5px] leading-5 text-fog">{text}</p>
    </section>
  );
}
