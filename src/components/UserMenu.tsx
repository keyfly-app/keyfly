"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/features/auth/actions";
import type { AppSite } from "@/lib/sites";

type Item = { href: string; label: string; icon: IconName; external?: boolean };

/**
 * Top-right user menu (canvas "Felhasználói menü"): who you are, your personal settings, help, sign out.
 * A real menu button: Escape and a click outside close it, focus returns to the button.
 */
export function UserMenu({
  site,
  name,
  email,
  initials,
  avatarUrl,
  items,
  openLabel,
  signOutLabel,
}: {
  site: AppSite;
  name: string | null;
  email: string;
  initials: string;
  avatarUrl: string | null;
  items: Item[];
  openLabel: string;
  signOutLabel: string;
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
    root.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = [...(root.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const at = all.indexOf(document.activeElement as HTMLElement);
    all[(at + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus();
  };

  const itemClass = "flex h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] font-medium text-ink hover:bg-paper focus-visible:bg-paper sm:h-9";
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={openLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-1 rounded-full pr-1.5 pl-0.5 hover:bg-paper sm:h-9"
      >
        <Avatar src={avatarUrl} initials={initials} size={32} />
        <Icon name="chevronDown" size={14} className={`text-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id={`${id}-menu`}
          role="menu"
          aria-label={openLabel}
          onKeyDown={onMenuKey}
          className="absolute right-0 z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-16px_rgb(12_31_25/0.3)]"
        >
          <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
            <Avatar src={avatarUrl} initials={initials} size={40} />
            <div className="flex min-w-0 flex-col">
              {name && <span className="truncate text-sm font-semibold">{name}</span>}
              <span className="truncate text-[12.5px] text-muted">{email}</span>
            </div>
          </div>
          <div className="mx-1 mb-1 h-px bg-line" />
          {items.map((item) =>
            item.external ? (
              <a key={item.href} role="menuitem" href={item.href} className={itemClass}>
                <Icon name={item.icon} size={16} className="text-muted" />
                {item.label}
              </a>
            ) : (
              <Link key={item.href} role="menuitem" href={item.href} onClick={() => setOpen(false)} className={itemClass}>
                <Icon name={item.icon} size={16} className="text-muted" />
                {item.label}
              </Link>
            ),
          )}
          <div className="mx-1 my-1 h-px bg-line" />
          <form action={signOut}>
            <input type="hidden" name="site" value={site} />
            <button type="submit" role="menuitem" className={itemClass}>
              <Icon name="logout" size={16} className="text-muted" />
              {signOutLabel}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
