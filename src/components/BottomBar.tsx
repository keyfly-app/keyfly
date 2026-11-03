"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { isActive, type NavItem } from "@/components/SideNav";

/**
 * Bottom bar on phones and tablets (canvas v3 `bbar()`): Áttekintés · the lease list · a raised round "+" where this
 * View has an action today · Menü. Fixed, above the home indicator; every place is a 64 px tall target.
 */
export function BottomBar({ label, items, add }: { label: string; items: NavItem[]; add?: { href: string; label: string; name: string } }) {
  const path = usePathname();
  const cell = (item: NavItem) => {
    const on = isActive(path, item);
    return (
      <li key={item.href} className="flex flex-1">
        <Link
          href={item.href}
          aria-current={on ? "page" : undefined}
          className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] leading-[14px] ${on ? "font-semibold text-ink" : "font-medium text-muted"}`}
        >
          <Icon name={item.icon} size={22} strokeWidth={on ? 2 : 1.75} />
          {item.label}
        </Link>
      </li>
    );
  };
  const last = items.length - 1;
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto flex h-16 max-w-[560px]">
        {items.slice(0, last).map(cell)}
        {add && (
          <li className="flex flex-1">
            <Link href={add.href} aria-label={add.name} className="group flex flex-1 flex-col items-center justify-center gap-1 text-[11px] leading-[14px] font-medium text-muted">
              <span aria-hidden="true" className="-mt-4 flex size-11 items-center justify-center rounded-full bg-ink text-white shadow-[0_6px_16px_-6px_rgb(12_31_25/0.5)] group-hover:bg-ink-soft">
                <Icon name="plus" size={22} strokeWidth={2.25} />
              </span>
              {add.label}
            </Link>
          </li>
        )}
        {cell(items[last]!)}
      </ul>
    </nav>
  );
}
