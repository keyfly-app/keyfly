"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Also active under these paths (e.g. a lease's page under "Szerződéseim"). */
  prefixes?: string[];
  /** To-dos waiting here, with what the number means for screen readers ("1 teendő"). */
  count?: { value: number; label: string };
};

export const isActive = (path: string, item: Pick<NavItem, "href" | "prefixes">) => path === item.href || (item.prefixes ?? []).some((p) => path.startsWith(p));

/**
 * Main menu of the left column (canvas v3 `nav()`): the items of this account and View, settings at the bottom after a
 * hairline. Active item: mist ground, ink semibold text, brand icon.
 */
export function SideNav({ label, items, footer }: { label: string; items: NavItem[]; footer: NavItem }) {
  const path = usePathname();
  const link = (item: NavItem) => {
    const on = isActive(path, item);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={on ? "page" : undefined}
        className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] ${on ? "bg-mist font-semibold text-ink" : "text-ink-soft hover:bg-paper"}`}
      >
        <Icon name={item.icon} size={17} strokeWidth={on ? 2 : 1.75} className={`flex-none ${on ? "text-brand" : "text-muted"}`} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.count && item.count.value > 0 && (
          <span className="flex h-5 min-w-5 flex-none items-center justify-center rounded-full bg-ink px-1.5 text-[11.5px] font-semibold text-white">
            <span aria-hidden="true">{item.count.value}</span>
            <span className="sr-only"> {item.count.label}</span>
          </span>
        )}
      </Link>
    );
  };
  return (
    <nav aria-label={label} className="mt-3.5 flex flex-1 flex-col">
      <div className="flex flex-col gap-0.5">{items.map(link)}</div>
      <div className="mt-auto flex flex-col border-t border-line pt-4">{link(footer)}</div>
    </nav>
  );
}
