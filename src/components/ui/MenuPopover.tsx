"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * A menu anchored to its trigger (App v2.3): dropdown from 640 px, bottom sheet on phones.
 * Escape, a click outside or Tab out closes it; focus returns to the trigger; arrows move between items.
 * Items are elements with role="menuitem" / "menuitemradio"; choosing one closes the menu (focus back on the trigger).
 */
export function MenuPopover({
  trigger,
  title,
  closeLabel,
  align = "start",
  width = 320,
  children,
}: {
  trigger: (props: { ref: React.Ref<HTMLButtonElement>; open: boolean; toggle: () => void; menuId: string }) => React.ReactNode;
  /** Shown as the heading of the bottom sheet on phones, and the menu's accessible name. */
  title: string;
  closeLabel: string;
  align?: "start" | "end";
  width?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback((focus = true) => {
    setOpen(false);
    if (focus) button.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>("[aria-checked=true], [role=menuitem], [role=menuitemradio]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") return setOpen(false);
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = [...(root.current?.querySelectorAll<HTMLElement>("[role=menuitem], [role=menuitemradio]") ?? [])];
    const at = all.indexOf(document.activeElement as HTMLElement);
    all[(at + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus();
  };

  return (
    <div ref={root} className="relative">
      {trigger({
        ref: button,
        open,
        toggle: () => setOpen((v) => !v),
        menuId: `${id}-menu`,
      })}
      {open && (
        <>
          <div aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/45 sm:hidden" />
          <div
            id={`${id}-menu`}
            role="menu"
            aria-label={title}
            onKeyDown={onMenuKey}
            style={{ "--menu-w": `${width}px` } as React.CSSProperties}
            className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface px-2 pt-2 pb-[max(28px,env(safe-area-inset-bottom))] shadow-[0_-16px_40px_-16px_rgb(12_31_25/0.3)] sm:absolute sm:inset-x-auto sm:top-full sm:bottom-auto sm:mt-1.5 sm:w-(--menu-w) sm:rounded-xl sm:border sm:border-line sm:p-1.5 sm:shadow-[0_1px_2px_rgb(12_31_25/0.06),0_16px_40px_-12px_rgb(12_31_25/0.24)] ${align === "end" ? "sm:right-0" : "sm:left-0"}`}
          >
            <div aria-hidden="true" className="flex justify-center pb-1 sm:hidden">
              <span className="h-1 w-9 rounded-full bg-field" />
            </div>
            <div className="flex items-center justify-between gap-3 px-3 pt-1 pb-2 sm:hidden">
              <p className="text-[15px] leading-5 font-semibold">{title}</p>
              <button
                type="button"
                onClick={() => close()}
                aria-label={closeLabel}
                className="-mr-2 flex size-11 flex-none items-center justify-center rounded-lg text-muted hover:text-ink"
              >
                <Icon name="x" size={20} strokeWidth={2} />
              </button>
            </div>
            <div
              className="flex flex-col gap-0.5"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[role^=menuitem]")) close();
              }}
            >
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
