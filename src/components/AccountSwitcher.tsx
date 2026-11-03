"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { CompanyMark } from "@/components/ui/CompanyMark";
import type { AccountView } from "@/features/companies/accounts";

export type SwitcherAccount = {
  id: string;
  name: string;
  sub: string;
  href: string;
  company: boolean;
  initials: string;
  avatarUrl?: string | null;
  logoUrl?: string | null;
  /** The View last picked in this account. */
  view: AccountView;
};

/** Account mark: a person's photo or initials on mist; a company's logo, or its initials in lime on deep green. */
export function AccountMark({ account, size }: { account: Pick<SwitcherAccount, "company" | "initials" | "avatarUrl" | "logoUrl">; size: number }) {
  if (!account.company) return <Avatar src={account.avatarUrl ?? null} initials={account.initials} size={size} />;
  return <CompanyMark logoUrl={account.logoUrl} initials={account.initials} size={size} />;
}

/**
 * Account switcher on top of the left column (canvas v3; "Fiókváltó – szerepkör, cégbeállítások, Cégeim"): shows where
 * you work now; lists your accounts with your role and plan, then the company's settings, "Cégeim kezelése" and "Add a
 * company". Desktop only (phones use the context chip). Escape, outside click or Tab closes it.
 */
export function AccountSwitcher({
  accounts,
  currentId,
  current,
  labels,
  addHref,
  manage,
  settings,
}: {
  accounts: SwitcherAccount[];
  currentId: string;
  /** The account shown on the button, with its context line ("Magánfiók", "Fiókgazda · Alap"). */
  current: SwitcherAccount;
  labels: { button: string; title: string; add: string };
  addHref: string;
  /** "Cégeim kezelése": all your companies, your role in them, pending requests. */
  manage?: { href: string; label: string };
  /** In a company account: its settings (details, team), one tap from where you see which account you are in. */
  settings?: { href: string; label: string };
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
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={labels.button}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-13 w-full min-w-0 items-center gap-2.5 rounded-[10px] border pr-2.5 pl-2 text-left ${open ? "border-ink bg-paper" : "border-line bg-surface hover:border-field"}`}
      >
        <AccountMark account={current} size={32} />
        <span className="flex min-w-0 flex-1 flex-col leading-4">
          <span className="truncate text-[13.5px] font-semibold">{current.name}</span>
          <span className="truncate text-xs text-muted">{current.sub}</span>
        </span>
        <Icon name="chevronDown" size={15} className={`flex-none text-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={`${id}-menu`} role="menu" aria-label={labels.title} onKeyDown={onMenuKey} className="absolute top-full left-0 z-50 mt-2 w-[320px] rounded-xl border border-line bg-surface p-2 shadow-[0_16px_40px_-16px_rgb(12_31_25/0.3)]">
          <p className="px-3 pt-1 pb-2 text-xs font-semibold text-muted">{labels.title}</p>
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
          {settings && (
            <Link href={settings.href} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium hover:bg-paper focus-visible:bg-paper">
              <Icon name="settings" size={16} className="text-muted" />
              {settings.label}
            </Link>
          )}
          {manage && (
            <Link href={manage.href} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium hover:bg-paper focus-visible:bg-paper">
              <Icon name="list" size={16} className="text-muted" />
              {manage.label}
            </Link>
          )}
          <Link href={addHref} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-semibold text-brand hover:bg-paper focus-visible:bg-paper">
            <Icon name="plus" size={16} strokeWidth={2} />
            {labels.add}
          </Link>
        </div>
      )}
    </div>
  );
}
