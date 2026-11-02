"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";

export type SwitcherAccount = { id: string; name: string; sub: string; href: string; company: boolean; initials: string; avatarUrl?: string | null };

/** Account mark: a person's photo or initials on mist; a company's initials in lime on deep green. */
export function AccountMark({ account, size }: { account: Pick<SwitcherAccount, "company" | "initials" | "avatarUrl">; size: number }) {
  if (!account.company) return <Avatar src={account.avatarUrl ?? null} initials={account.initials} size={size} />;
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex flex-none items-center justify-center rounded-full bg-brand-deep text-[11px] font-semibold text-lime"
    >
      {account.initials}
    </span>
  );
}

/**
 * Top-left account switcher (canvas "Fiókváltó"): shows where you work now; lists your personal and company accounts,
 * and "Add a company". Dropdown from 640 px, bottom sheet on phones. Escape, outside click or Tab closes it.
 */
export function AccountSwitcher({
  accounts,
  currentId,
  current,
  labels,
  addHref,
}: {
  accounts: SwitcherAccount[];
  currentId: string;
  /** The account shown on the button, with its context line ("Magánfiók", "Cégfiók · Alap"). */
  current: SwitcherAccount;
  labels: { button: string; title: string; add: string; note: string; close: string };
  addHref: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>("[aria-current=true], [role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") return setOpen(false);
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = [...(root.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const at = all.indexOf(document.activeElement as HTMLElement);
    all[(at + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus();
  };

  return (
    <div ref={root} className="relative min-w-0">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={labels.button}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 max-w-[200px] min-w-0 items-center gap-2 rounded-lg border pr-2 pl-1 text-left sm:h-9 sm:max-w-[280px] ${open ? "border-ink bg-paper" : "border-line bg-surface hover:border-field"}`}
      >
        <AccountMark account={current} size={28} />
        <span className="flex min-w-0 flex-col leading-[15px]">
          <span className="truncate text-[13px] font-semibold">{current.name}</span>
          <span className="truncate text-[11.5px] text-muted">{current.sub}</span>
        </span>
        <Icon name="chevronDown" size={14} className={`flex-none text-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/45 sm:hidden" />
          <div
            id={`${id}-menu`}
            role="menu"
            aria-label={labels.title}
            onKeyDown={onMenuKey}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface px-2 pt-2 pb-[max(24px,env(safe-area-inset-bottom))] shadow-[0_-16px_40px_-16px_rgb(12_31_25/0.3)] sm:absolute sm:inset-x-auto sm:top-full sm:bottom-auto sm:left-0 sm:mt-2 sm:w-[340px] sm:rounded-xl sm:border sm:border-line sm:p-2 sm:shadow-[0_16px_40px_-16px_rgb(12_31_25/0.3)]"
          >
            <div aria-hidden="true" className="flex justify-center pb-1 sm:hidden">
              <span className="h-1 w-9 rounded-full bg-field" />
            </div>
            <div className="flex items-center justify-between px-3 pt-1 pb-2">
              <p className="text-xs font-semibold text-muted">{labels.title}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label={labels.close} className="-my-2 -mr-2 flex size-11 items-center justify-center rounded-lg text-muted hover:text-ink sm:hidden">
                <Icon name="x" size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {accounts.map((a) => {
                const on = a.id === currentId;
                return (
                  <Link
                    key={a.id}
                    href={a.href}
                    role="menuitem"
                    aria-current={on || undefined}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-12 items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-paper focus-visible:bg-paper ${on ? "bg-paper" : ""}`}
                  >
                    <AccountMark account={a} size={32} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{a.name}</span>
                      <span className="truncate text-[12.5px] text-muted">{a.sub}</span>
                    </span>
                    {on ? <Icon name="check" size={18} strokeWidth={2.25} className="flex-none" /> : <span className="w-[18px] flex-none" />}
                  </Link>
                );
              })}
            </div>
            <div className="mx-1 my-1.5 h-px bg-line" />
            <Link href={addHref} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm font-semibold text-brand hover:bg-paper focus-visible:bg-paper sm:min-h-9">
              <Icon name="plus" size={16} strokeWidth={2} />
              {labels.add}
            </Link>
            <p className="px-2.5 pt-1.5 pb-1 text-[12.5px] leading-[17px] text-muted">{labels.note}</p>
          </div>
        </>
      )}
    </div>
  );
}
