"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";

/**
 * Small "i" button with a short explanation. Opens on hover, focus or tap; Esc or tapping again closes it.
 * The text is always linked to the button (aria-describedby), so screen readers hear it without opening.
 */
export function InfoTip({ text, align = "start" }: { text: string; align?: "start" | "end" }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={t("moreInfo")}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="-m-3.5 inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-brand"
      >
        <Icon name="info" size={16} strokeWidth={1.8} />
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={`absolute top-7 z-10 w-64 rounded-[10px] bg-ink px-3 py-2.5 text-[13px] leading-[1.45] font-medium text-white shadow-[0_12px_28px_-12px_rgba(12,31,25,.5)] ${align === "start" ? "-left-3" : "-right-3"}`}
      >
        {text}
      </span>
    </span>
  );
}
