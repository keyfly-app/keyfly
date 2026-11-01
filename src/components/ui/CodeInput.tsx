"use client";

import { Fragment, useState } from "react";
import { FieldError, Label } from "./form";

/**
 * One-time code entry shown as six boxes (approved design). A single real input sits on top of the boxes,
 * so typing, pasting, SMS/authenticator autofill and screen readers all work as with a normal field.
 */
export function CodeInput({
  id,
  name,
  label,
  error,
  autoFocus,
  length = 6,
  onComplete,
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  autoFocus?: boolean;
  length?: number;
  onComplete?: (code: string) => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(Boolean(autoFocus));
  const active = Math.min(value.length, length - 1);
  // A wrong code is shown until the person starts typing again.
  const invalid = Boolean(error) && value === "";

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative self-start">
        <div aria-hidden="true" className="flex items-center gap-2">
          {Array.from({ length }, (_, i) => {
            const current = focused && i === active && !invalid;
            return (
              <Fragment key={i}>
                {/* 3 + 3 grouping, like the codes in authenticator apps */}
                {i === length / 2 && <span className="h-0.5 w-1.5 flex-none rounded-sm bg-field" />}
                <span
                  className={`flex h-12 w-11 flex-none items-center justify-center rounded-lg border bg-surface font-display text-xl font-semibold tabular-nums transition-[border-color,box-shadow] motion-reduce:transition-none ${
                    invalid ? "border-danger-ink" : current ? "border-brand shadow-[0_0_0_3px_rgb(14_90_67/0.16)]" : "border-field"
                  }`}
                >
                  {value[i] ?? (current ? <span className="h-5 w-px animate-pulse bg-ink motion-reduce:animate-none" /> : "")}
                </span>
              </Fragment>
            );
          })}
        </div>
        <input
          id={id}
          name={name}
          value={value}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, length);
            setValue(digits);
            if (digits.length === length) onComplete?.(digits);
          }}
          onFocus={(e) => {
            setFocused(true);
            // The caret always sits at the end: boxes fill left to right, backspace clears from the right.
            e.currentTarget.setSelectionRange(value.length, value.length);
          }}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={`\\d{${length}}`}
          maxLength={length}
          autoFocus={autoFocus}
          spellCheck={false}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className="absolute inset-0 h-full w-full cursor-text text-base opacity-0"
        />
      </div>
      {invalid && error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}
