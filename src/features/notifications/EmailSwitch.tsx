"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/components/Toaster";
import { setEmailTopic } from "./actions";

/** One email topic as a switch: changes at once, says so in a toast, and flips back if saving fails. */
export function EmailSwitch({ topic, label, text, initial }: { topic: string; label: string; text: string; initial: boolean }) {
  const t = useTranslations("settings.notifications");
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const flip = () => {
    const next = !on;
    setOn(next);
    start(async () => {
      if (await setEmailTopic(topic, next)) toast(next ? t("turnedOn", { name: label }) : t("turnedOff", { name: label }));
      else {
        setOn(!next);
        toast(t("error"), "error");
      }
    });
  };
  const id = `email-${topic}`;
  return (
    <li className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5 sm:px-6">
      <div className="flex min-w-0 flex-col">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        <span id={`${id}-text`} className="text-[12.5px] text-muted">
          {text}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-text`}
        aria-busy={pending || undefined}
        onClick={flip}
        className="group flex size-11 flex-none items-center justify-center rounded-lg sm:h-9 sm:w-12"
      >
        <span className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors motion-reduce:transition-none ${on ? "bg-ink" : "bg-field"} group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-brand`}>
          <span className={`size-5 rounded-full bg-white shadow-[0_1px_2px_rgb(12_31_25/0.25)] transition-transform motion-reduce:transition-none ${on ? "translate-x-4" : ""}`} />
        </span>
      </button>
    </li>
  );
}
