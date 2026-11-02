"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";
import { INPUT_CLASS, Label } from "@/components/ui/form";
import { MAX_FLOOR, NAMED_FLOORS } from "./validate";

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/**
 * Floor field (canvas "Meghívás 1 – emelet bármilyen számmal"): type a number ("28" → "28. emelet", up to 99) or pick a
 * named level (ground floor, mezzanine, basement, attic…). Value: "" | a named floor | "numbered:28".
 */
export function FloorInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const t = useTranslations("leaseRequest.address");
  const listId = useId();
  const [text, setText] = useState<string | null>(null); // null: not editing, the chosen value is shown
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const labelOf = (v: string) => {
    if (v.startsWith("numbered:")) return t("floorNumbered", { number: Number(v.slice(9)) });
    return (NAMED_FLOORS as readonly string[]).includes(v) ? t(`floors.${v as (typeof NAMED_FLOORS)[number]}`) : "";
  };
  const editing = text !== null;
  const typed = text ?? "";
  const options = useMemo(() => {
    const q = fold(typed);
    const n = Number(q.replace(/\D/g, ""));
    const numbered = /^\d{1,2}\.?$/.test(q) && n >= 1 && n <= MAX_FLOOR ? [`numbered:${n}`] : [];
    const named = NAMED_FLOORS.filter((f) => !q || numbered.length > 0 || fold(t(`floors.${f}`)).includes(q));
    return [...numbered, ...named];
  }, [typed, t]);

  const choose = (v: string) => {
    onChange(v);
    setText(null);
  };
  // Leaving the field keeps a typed number or an exact name; anything else goes back to the last choice.
  const commit = () => {
    if (!editing) return;
    if (!typed.trim()) return choose("");
    const exact = options.find((o) => o.startsWith("numbered:") || fold(labelOf(o)) === fold(typed));
    if (exact) choose(exact);
    else setText(null);
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!editing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && options[active]) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setText(null);
    }
  };

  const open = editing && options.length > 0;
  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{t("floor")}</Label>
      <input
        ref={input}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        value={editing ? typed : labelOf(value)}
        onFocus={() => {
          setText(value.startsWith("numbered:") ? value.slice(9) : "");
          setActive(0);
        }}
        onChange={(e) => {
          setText(e.target.value.slice(0, 30));
          setActive(0);
        }}
        onBlur={() => setTimeout(commit, 120)}
        onKeyDown={onKey}
        placeholder={t("floorPlaceholder")}
        autoComplete="off"
        spellCheck={false}
        className={`${INPUT_CLASS} pr-8`}
      />
      <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 bottom-3 text-muted sm:bottom-2.5" />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("floorOptions")}
          className="absolute top-full left-0 z-20 mt-1.5 w-[max(100%,13rem)] rounded-xl border border-line bg-surface p-1.5 shadow-[0_1px_2px_rgb(12_31_25/0.06),0_16px_40px_-12px_rgb(12_31_25/0.24)]"
        >
          {options.map((o, i) => [
            <li
              key={o}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-sm sm:min-h-9 ${i === active ? "bg-paper" : ""} ${
                o.startsWith("numbered:") ? "font-semibold" : "font-medium"
              }`}
            >
              {labelOf(o)}
              {o === value && <Icon name="check" size={16} strokeWidth={2.25} className="text-brand" />}
            </li>,
            o.startsWith("numbered:") && options.length > 1 ? <li key="sep" role="presentation" className="mx-1 my-1.5 h-px bg-line" /> : null,
          ])}
        </ul>
      )}
    </div>
  );
}
