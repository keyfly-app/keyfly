"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SettingsLink } from "./SettingsNav";

/** A company's settings pages as tabs under its name (canvas v2.4 "Beállítások – cég fülekkel"). */
export function CompanyTabs({ label, tabs }: { label: string; tabs: SettingsLink[] }) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-6">
        {tabs.map((tab) => {
          const on = path.endsWith(tab.href.replace(/^https?:\/\/[^/]+/, ""));
          return (
            <li key={tab.href} className="flex-none">
              <Link
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-11 items-center px-0.5 text-sm whitespace-nowrap ${on ? "font-semibold text-ink shadow-[inset_0_-2px_0_var(--color-ink)]" : "font-medium text-muted hover:text-ink"}`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
