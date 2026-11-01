import { FieldError, INPUT_CLASS, Label } from "@/components/ui/form";
import type { Enums } from "@/lib/supabase/database.types";

/** Small building blocks of the lease request screens (approved design: canvas "A bérlő hívja meg a bérbeadót"). */

export function StepBar({ step, total, name, label, count }: { step: number; total: number; name: string; label: string; count: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.05em] text-brand uppercase">{name}</span>
        <span className="text-[13px] text-muted tabular-nums">{count}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-valuetext={count} className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

/** Two-way switch (radio group) in the app's segmented style. */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="flex rounded-xl bg-mist p-0.75">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[9px] text-sm font-semibold text-muted has-checked:bg-surface has-checked:text-ink has-checked:shadow-[0_1px_2px_rgba(12,31,25,.12)] has-focus-visible:outline-3 has-focus-visible:outline-brand"
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
}) {
  const described = [error && `${id}-error`, note && `${id}-note`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
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
        <span aria-hidden="true" className="pointer-events-none absolute top-0 right-3.5 flex h-12 items-center text-[15px] font-medium text-muted">
          {currency}
        </span>
      </div>
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

const CHIP = {
  waiting: "bg-lime-soft text-ink",
  attention: "bg-warning-soft text-warning-ink",
  done: "bg-mist text-brand",
  off: "bg-danger-soft text-danger-ink",
  closed: "bg-paper text-muted",
} as const;

export const STATUS_TONE: Record<Enums<"lease_request_status"> | "expired", keyof typeof CHIP> = {
  pending_landlord: "waiting",
  expired: "attention",
  pending_tenant: "attention",
  confirmed: "done",
  declined: "off",
  cancelled: "closed",
};

export function Chip({ tone, children }: { tone: keyof typeof CHIP; children: React.ReactNode }) {
  return <span className={`inline-flex flex-none items-center self-start rounded-md px-2 py-0.75 text-xs leading-snug font-semibold whitespace-nowrap ${CHIP[tone]}`}>{children}</span>;
}

/** Label / value list in a bordered card. */
export function DetailRows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="rounded-2xl border border-line bg-surface px-4 py-1">
      {rows.map(([k, v], i) => (
        <div key={k} className={`flex gap-3 py-2.75 text-sm ${i ? "border-t border-line" : ""}`}>
          <dt className="w-32 flex-none text-muted">{k}</dt>
          <dd className="min-w-0 font-medium tabular-nums">{v}</dd>
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
      <Chip tone="attention">{label}</Chip>
    </span>
  );
}
