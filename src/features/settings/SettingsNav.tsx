"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

export type SettingsLink = { href: string; label: string; icon: IconName; text?: string };

/** Settings menu (canvas Menütérkép): personal items follow you in every account. Sidebar on desktop, a list on phones. */
export function SettingsNav({ heading, label, links, variant = "sidebar" }: { heading: string; label: string; links: SettingsLink[]; variant?: "sidebar" | "list" }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.endsWith(href.replace(/^https?:\/\/[^/]+/, ""));
  if (variant === "list") {
    return (
      <nav aria-label={label} className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold text-muted">{heading}</h2>
        <ul className="overflow-hidden rounded-xl border border-line bg-surface">
          {links.map((l, i) => (
            <li key={l.href} className={i ? "border-t border-line" : ""}>
              <Link href={l.href} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-paper">
                <Icon name={l.icon} size={18} className="flex-none text-ink" />
                <span className="flex flex-1 flex-col">
                  <span className="text-[15px] font-medium">{l.label}</span>
                  {l.text && <span className="text-[12.5px] text-muted">{l.text}</span>}
                </span>
                <Icon name="chevronRight" size={16} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label={label} className="flex flex-col gap-0.5">
      <h2 className="px-2.5 pt-1 pb-1.5 text-xs font-semibold text-muted">{heading}</h2>
      {links.map((l) => {
        const on = active(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-9 items-center gap-2.5 rounded-lg border px-2.5 text-[13.5px] ${on ? "border-line bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(12_31_25/0.08)]" : "border-transparent text-ink-soft hover:bg-surface"}`}
          >
            <Icon name={l.icon} size={16} className={on ? "text-ink" : "text-muted"} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
