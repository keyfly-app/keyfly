"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { CompanyMark } from "@/components/ui/CompanyMark";

export type SettingsLink = {
  href: string;
  label: string;
  icon?: IconName;
  /** A company's mark instead of an icon. */
  initials?: string;
  logoUrl?: string | null;
  /** Active on every page under this path (a company's tabs). */
  prefix?: string;
};
export type SettingsGroup = { heading?: string; links: SettingsLink[] };

const pathOf = (href: string) => href.replace(/^https?:\/\/[^/]+/, "");

/**
 * The one settings menu (canvas v2.4 "Beállítások – cég fülekkel"): Összefoglaló, your personal pages, then your
 * companies – each one item, its pages are tabs. The same on every settings page; desktop only (phones use the Summary).
 */
export function SettingsNav({ label, groups, add }: { label: string; groups: SettingsGroup[]; add?: { href: string; label: string } }) {
  const path = usePathname();
  const active = (l: SettingsLink) => (l.prefix ? path.startsWith(pathOf(l.prefix)) : path === pathOf(l.href) || path.endsWith(pathOf(l.href)));
  return (
    <nav aria-label={label} className="flex flex-col gap-0.5">
      {groups.map((g, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {g.heading && <h2 className="px-2.5 pt-3.5 pb-1.5 text-xs font-semibold text-muted">{g.heading}</h2>}
          {g.links.map((l) => {
            const on = active(l);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-9 min-w-0 items-center gap-2.5 rounded-lg border px-2.5 text-[13.5px] ${on ? "border-line bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(12_31_25/0.08)]" : "border-transparent text-ink-soft hover:bg-surface"}`}
              >
                <span aria-hidden="true" className="flex w-5 flex-none justify-center">
                  {l.initials ? (
                    <CompanyMark logoUrl={l.logoUrl} initials={l.initials} size={20} />
                  ) : (
                    l.icon && <Icon name={l.icon} size={16} className={on ? "text-ink" : "text-muted"} />
                  )}
                </span>
                <span className="truncate">{l.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
      {add && (
        <Link href={add.href} className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-semibold text-brand hover:bg-surface">
          <span aria-hidden="true" className="flex w-5 justify-center">
            <Icon name="plus" size={16} strokeWidth={2} />
          </span>
          {add.label}
        </Link>
      )}
    </nav>
  );
}
