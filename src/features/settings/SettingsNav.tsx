"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

export type SettingsLink = { href: string; label: string; icon: IconName; text?: string };

/** A company group's heading: its mark, its name and your role in it (canvas "Cégadatok – szerkeszthető"). */
function CompanyHeading({ name, initials, role, as: Tag }: { name: string; initials: string; role: string; as: "h2" | "div" }) {
  return (
    <Tag className="flex items-center gap-2.5 px-2.5 pt-1 pb-2">
      <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-brand-deep text-[11px] font-semibold text-lime">
        {initials}
      </span>
      <span className="flex min-w-0 flex-col leading-4">
        <span className="truncate text-[13px] font-semibold text-ink">{name}</span>
        <span className="text-xs font-normal text-muted">{role}</span>
      </span>
    </Tag>
  );
}

/**
 * Settings menu (canvas "Cégadatok – szerkeszthető", Menütérkép): inside a company its group comes first, with its mark
 * and your role; your personal items follow you in every account. Sidebar on desktop, a list on phones.
 */
export function SettingsNav({
  heading,
  label,
  links,
  variant = "sidebar",
  company,
}: {
  heading: string;
  label: string;
  links: SettingsLink[];
  variant?: "sidebar" | "list";
  company?: { initials: string; role: string };
}) {
  const path = usePathname();
  const active = (href: string) => path === href || path.endsWith(href.replace(/^https?:\/\/[^/]+/, ""));
  if (variant === "list") {
    return (
      <nav aria-label={label} className="flex flex-col gap-2">
        {company ? (
          <div className="-mx-1.5">
            <CompanyHeading name={heading} initials={company.initials} role={company.role} as="h2" />
          </div>
        ) : (
          <h2 className="px-1 text-xs font-semibold text-muted">{heading}</h2>
        )}
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
      {company ? <CompanyHeading name={heading} initials={company.initials} role={company.role} as="h2" /> : <h2 className="px-2.5 pt-1 pb-1.5 text-xs font-semibold text-muted">{heading}</h2>}
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
