"use client";

import { useId } from "react";
import { Icon, isIconName } from "@/components/Icon";
import { FieldError, TextField } from "@/components/ui/form";
import { asksLabel, type CatalogOption } from "@/features/catalog/types";

/**
 * Property type as tiles (canvas "Új ingatlan", 3 × 3; two columns on phones): a radio group, labels wrap instead of
 * spilling. A type that asks for a name ("Egyéb") opens "Mi ez?" below.
 */
export function TypeTiles({
  legend,
  options,
  value,
  onChange,
  otherLabel,
  onOtherLabel,
  labels,
  error,
  otherError,
}: {
  legend: string;
  options: CatalogOption[];
  value: string;
  onChange: (key: string) => void;
  otherLabel: string;
  onOtherLabel: (v: string) => void;
  labels: { other: string; otherPlaceholder: string };
  error?: string;
  otherError?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-3">
      <fieldset aria-describedby={error ? `${id}-error` : undefined}>
        <legend className="mb-3 text-[15px] leading-5 font-semibold">{legend}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((o) => (
            <label
              key={o.key}
              className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border border-field bg-surface px-3 py-2.5 text-sm font-medium hover:border-ink has-checked:border-ink has-checked:bg-mist/60 has-focus-visible:outline-3 has-focus-visible:outline-brand"
            >
              <input type="radio" name="kind" value={o.key} checked={value === o.key} onChange={() => onChange(o.key)} className="sr-only" />
              <Icon name={isIconName(o.icon) ? o.icon : "home"} size={18} strokeWidth={1.75} className="flex-none text-ink-soft" />
              <span className="min-w-0 flex-1 leading-[18px] [overflow-wrap:anywhere]">{o.label}</span>
              {value === o.key && <Icon name="check" size={16} strokeWidth={2.25} className="flex-none" />}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <FieldError id={`${id}-error`} message={error} />}
      {value && asksLabel(options, value) && (
        <div className="sm:max-w-[280px]">
          <TextField
            id={`${id}-other`}
            name="otherLabel"
            label={labels.other}
            placeholder={labels.otherPlaceholder}
            value={otherLabel}
            onChange={(e) => onOtherLabel(e.target.value)}
            maxLength={40}
            error={otherError}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
