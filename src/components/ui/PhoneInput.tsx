"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { callingCode, formatNational, type CountryCode } from "@/lib/phone";
import { FieldError, Label, Optional } from "./form";

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Phone field with the country code apart (canvas "Telefonszám – országkód", "Országkód választása"): the code opens a
 * searchable list (under the field from 640 px, a full screen on phones); the number is formatted as it is typed.
 * Posts `name` (the number as typed) and `${name}Country` (ISO code); the server makes the E.164 number of them.
 */
export function PhoneInput({
  id,
  name,
  label,
  optional,
  countries,
  country,
  value,
  onChange,
  error,
  autoFocus,
  readOnly,
  required,
}: {
  id: string;
  name: string;
  label: string;
  optional?: string;
  countries: readonly CountryCode[];
  country: CountryCode;
  value: string;
  onChange: (country: CountryCode, value: string) => void;
  error?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  required?: boolean;
}) {
  const t = useTranslations("phoneInput");
  const locale = useLocale();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const number = useRef<HTMLInputElement>(null);

  const names = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const nameOf = (c: CountryCode) => names.of(c) ?? c;
  // Hungary first, then by name in the page's language.
  const sorted = useMemo(
    () => [...countries].sort((a, b) => (a === "HU" ? -1 : b === "HU" ? 1 : (names.of(a) ?? a).localeCompare(names.of(b) ?? b, locale))),
    [countries, names, locale],
  );
  const q = fold(query.trim().replace(/^\+/, ""));
  const shown = q ? sorted.filter((c) => fold(nameOf(c)).includes(q) || c.toLowerCase() === q || callingCode(c).startsWith(q)) : sorted;

  const close = (focusTrigger = true) => {
    setOpen(false);
    setQuery("");
    if (focusTrigger) trigger.current?.focus();
  };
  const choose = (c: CountryCode) => {
    onChange(c, formatNational(c, value));
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => number.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // The chosen country is in view when the list opens.
  useEffect(() => {
    if (open) panel.current?.querySelector("[aria-selected=true]")?.scrollIntoView({ block: "center" });
  }, [open]);
  const move = (next: number) => {
    setActive(next);
    requestAnimationFrame(() => document.getElementById(`${listId}-${shown[next]}`)?.scrollIntoView({ block: "nearest" }));
  };

  const toggle = () => {
    if (readOnly) return;
    if (!open && field.current) {
      const r = field.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
      setActive(Math.max(0, sorted.indexOf(country)));
    }
    setOpen((v) => !v);
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // the dialog around stays open
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(Math.min(active + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(Math.max(active - 1, 0));
    } else if (e.key === "Enter" && shown[active]) {
      e.preventDefault();
      choose(shown[active]);
    }
  };

  const onType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    // A whole international number pasted in: pick its country if it is offered.
    if (/^\s*(\+|00)/.test(next)) {
      const digits = next.replace(/\D/g, "").replace(/^00/, "");
      const match = countries
        .filter((c) => digits.startsWith(callingCode(c)))
        .sort((a, b) => callingCode(b).length - callingCode(a).length || (a === country ? -1 : b === country ? 1 : 0))[0];
      if (match) return onChange(match, formatNational(match, digits.slice(callingCode(match).length)));
    }
    // Backspace over a space removes the digit before it too.
    const plain = (v: string) => v.replace(/\D/g, "");
    const removedOnlyFormatting = next.length < value.length && plain(next) === plain(value);
    const digits = removedOnlyFormatting ? plain(value).slice(0, -1) : next;
    onChange(country, formatNational(country, digits));
  };

  const code = callingCode(country);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        <Optional>{optional}</Optional>
      </Label>
      <div
        ref={field}
        className={`flex h-11 min-w-0 items-stretch overflow-hidden rounded-lg border sm:h-10 ${
          error ? "border-danger-ink shadow-[0_0_0_3px_rgb(138_28_28/0.1)]" : "border-field focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgb(14_90_67/0.16)]"
        } ${readOnly ? "bg-paper" : "bg-surface"}`}
      >
        <input type="hidden" name={`${name}Country`} value={country} />
        <button
          ref={trigger}
          type="button"
          onClick={toggle}
          disabled={readOnly}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={t("codeOf", { country: nameOf(country), code: `+${code}` })}
          className={`flex flex-none items-center gap-1.5 border-r border-line pr-2 pl-3 text-base tabular-nums sm:text-sm ${open ? "bg-mist" : "bg-paper hover:bg-mist"} disabled:hover:bg-paper`}
        >
          <span className="text-xs font-semibold tracking-[0.03em] text-muted">{country}</span>
          <span>+{code}</span>
          {!readOnly && <Icon name="chevronDown" size={15} className="text-muted" />}
        </button>
        <input
          ref={number}
          id={id}
          name={name}
          value={value}
          onChange={onType}
          readOnly={readOnly}
          required={required}
          autoFocus={autoFocus}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={24}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`min-w-0 flex-1 bg-transparent px-3 text-base tracking-[0.01em] tabular-nums placeholder:text-muted/70 focus-visible:outline-none sm:text-sm ${readOnly ? "text-ink-soft" : "text-ink"}`}
        />
      </div>
      {error && <FieldError id={`${id}-error`} message={error} />}

      {open && (
        <div
          ref={panel}
          onKeyDown={onListKey}
          style={{ "--pop-top": `${pos.top}px`, "--pop-left": `${pos.left}px` } as React.CSSProperties}
          className="fixed inset-0 z-[70] flex flex-col bg-surface sm:inset-auto sm:top-(--pop-top) sm:left-(--pop-left) sm:max-h-[340px] sm:w-[300px] sm:rounded-xl sm:border sm:border-line sm:p-2 sm:shadow-[0_1px_2px_rgb(12_31_25/0.06),0_16px_40px_-12px_rgb(12_31_25/0.24)]"
        >
          <div className="flex h-14 flex-none items-center gap-1 border-b border-line px-2 sm:hidden">
            <button type="button" onClick={() => close()} aria-label={t("back")} className="flex size-11 items-center justify-center rounded-lg">
              <Icon name="back" size={20} strokeWidth={2} />
            </button>
            <p className="text-base font-semibold">{t("title")}</p>
          </div>
          <div className="relative flex-none px-4 py-3 sm:p-0 sm:pb-1.5">
            <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-7 -translate-y-1/2 text-muted sm:left-3 sm:-mt-[3px]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder={t("search")}
              aria-label={t("search")}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={shown[active] ? `${listId}-${shown[active]}` : undefined}
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full rounded-lg border border-brand bg-surface pr-3 pl-9 text-base shadow-[0_0_0_3px_rgb(14_90_67/0.16)] focus-visible:outline-none sm:h-10 sm:text-sm"
            />
          </div>
          <ul id={listId} role="listbox" aria-label={t("title")} className="min-h-0 flex-1 overflow-y-auto pb-[max(16px,env(safe-area-inset-bottom))] sm:pb-0">
            {shown.map((c, i) => (
              <li
                key={c}
                id={`${listId}-${c}`}
                role="option"
                aria-selected={c === country}
                onClick={() => choose(c)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-12 cursor-pointer items-center gap-2.5 px-4 sm:min-h-9 sm:rounded-lg sm:px-2.5 ${i === active ? "bg-paper" : ""}`}
              >
                <span className={`min-w-0 flex-1 text-sm ${c === country ? "font-semibold" : "font-medium"}`}>{nameOf(c)}</span>
                <span className="text-[13.5px] text-muted tabular-nums">+{callingCode(c)}</span>
                <span className="flex w-4 flex-none justify-center">{c === country && <Icon name="check" size={16} strokeWidth={2.25} className="text-brand" />}</span>
              </li>
            ))}
            {shown.length === 0 && <li className="px-4 py-3 text-sm text-muted sm:px-2.5">{t("none")}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
