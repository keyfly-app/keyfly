"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";

export type MenuChoice = { value: string; label: string; text?: string; icon?: IconName; lang?: string };

/**
 * Quiet icon button in the app header with a single-choice menu (canvas "Fejléc ikonok": Nézet, Nyelv).
 * Hover or keyboard focus shows the name; the menu is a dropdown from 640 px and a bottom sheet on phones.
 * Each choice is a submit button of one form, so the server action receives `name=value`.
 * Escape, a click outside or Tab out of the menu closes it; focus returns to the button.
 */
export function HeaderMenu({
  icon,
  label,
  current,
  name,
  choices,
  action,
  title,
  lead,
  note,
  hidden,
  closeLabel,
  heading = "title",
}: {
  icon: IconName;
  /** Short name in the tooltip ("Nézet"); `current` is added for screen readers ("Nézet: Bérlő"). */
  label: string;
  current: string;
  name: string;
  choices: MenuChoice[];
  action: (form: FormData) => void;
  title: string;
  lead?: string;
  note?: string;
  /** Extra hidden fields of the form (e.g. the page to return to). */
  hidden?: Record<string, string>;
  closeLabel: string;
  /** "title": a heading with an optional lead line; "eyebrow": a small caps label (a plain list such as languages). */
  heading?: "title" | "eyebrow";
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const currentChoice = choices.find((c) => c.value === current);

  useEffect(() => {
    if (!open) return;
    const close = (focus: boolean) => {
      setOpen(false);
      if (focus) button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>("[aria-checked=true], [role=menuitemradio]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") return setOpen(false);
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = [...(root.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]") ?? [])];
    const at = all.indexOf(document.activeElement as HTMLElement);
    all[(at + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus();
  };

  return (
    <div ref={root} className="group relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={currentChoice ? `${label}: ${currentChoice.label}` : label}
        onClick={() => setOpen((v) => !v)}
        className={`flex size-11 items-center justify-center rounded-lg border text-ink transition-colors motion-reduce:transition-none sm:size-9 ${open ? "border-ink bg-paper" : "border-transparent hover:bg-paper"}`}
      >
        <Icon name={icon} size={19} strokeWidth={1.75} />
      </button>
      {!open && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-full left-1/2 z-40 mt-1.5 hidden -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:block"
        >
          {label}
        </span>
      )}
      {open && (
        <>
          <div aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/45 sm:hidden" />
          <div
            id={`${id}-menu`}
            role="menu"
            aria-label={title}
            onKeyDown={onMenuKey}
            className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface px-2 pt-2 pb-[max(28px,env(safe-area-inset-bottom))] shadow-[0_-16px_40px_-16px_rgb(12_31_25/0.3)] sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-2 sm:rounded-xl ${heading === "eyebrow" ? "sm:w-[220px]" : "sm:w-[340px]"} sm:border sm:border-line sm:p-2 sm:shadow-[0_16px_40px_-16px_rgb(12_31_25/0.3)]`}
          >
            <div aria-hidden="true" className="flex justify-center pb-1 sm:hidden">
              <span className="h-1 w-9 rounded-full bg-field" />
            </div>
            <div className="flex items-start justify-between gap-3 px-3 pt-1 pb-2">
              {heading === "eyebrow" ? (
                <p className="pt-1 text-xs font-semibold tracking-[0.05em] text-muted uppercase">{title}</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <p className="text-[15px] leading-5 font-semibold">{title}</p>
                  {lead && <p className="text-[13px] leading-[18px] text-muted">{lead}</p>}
                </div>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label={closeLabel} className="-mt-1.5 -mr-2 flex size-11 flex-none items-center justify-center rounded-lg text-muted hover:text-ink sm:hidden">
                <Icon name="x" size={20} strokeWidth={2} />
              </button>
            </div>
            <form action={action} onSubmit={() => setOpen(false)} className="flex flex-col gap-0.5">
              {Object.entries(hidden ?? {}).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              {choices.map((c) => {
                const on = c.value === current;
                return (
                  <button
                    key={c.value}
                    type="submit"
                    name={name}
                    value={c.value}
                    role="menuitemradio"
                    aria-checked={on}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-paper focus-visible:bg-paper sm:min-h-9 ${on ? "bg-paper" : ""}`}
                  >
                    {c.icon && (
                      <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-lg bg-mist text-brand">
                        <Icon name={c.icon} size={17} />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span lang={c.lang} className={`text-sm ${c.icon ? "font-semibold" : "font-medium"}`}>
                        {c.label}
                      </span>
                      {c.text && <span className="text-[12.5px] leading-[17px] text-muted">{c.text}</span>}
                    </span>
                    {on ? <Icon name="check" size={18} strokeWidth={2.25} className="flex-none" /> : <span className="w-[18px] flex-none" />}
                  </button>
                );
              })}
            </form>
            {note && (
              <p className="mx-1 mt-1 flex gap-2 border-t border-paper px-2 pt-2.5 pb-1 text-[12.5px] leading-[17px] text-muted">
                <Icon name="info" size={15} className="mt-px flex-none" />
                {note}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
