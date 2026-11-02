"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProgressRing } from "./ProgressRing";

export type GuideStep = { id: string; title: string; sub: string; done: boolean; action?: { href: string; label: string } };

const KEY = "keyfly.setupGuide.hidden";
const listeners = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * "Fiókod beállítása" (canvas v2.4): the few steps that matter, done ones struck through, with a progress ring.
 * "Elrejtés" hides it in this browser; the user menu keeps the way back.
 */
export function SetupGuide({ title, hide, doneLabel, progressLabel, steps }: { title: string; hide: string; doneLabel: string; progressLabel: string; steps: GuideStep[] }) {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  const onHide = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    listeners.forEach((fn) => fn());
  };
  return (
    <section aria-labelledby="setup-guide" className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
        <ProgressRing done={done} total={steps.length} label={progressLabel} />
        <h2 id="setup-guide" className="flex-1 text-[15px] font-semibold">
          {title}
        </h2>
        <button type="button" onClick={onHide} className="-mr-2 inline-flex min-h-11 items-center rounded-lg px-2 text-[13px] font-medium text-muted hover:text-ink sm:min-h-9">
          {hide}
        </button>
      </div>
      <ul>
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-3.5 border-t border-line px-4 py-3 sm:px-5">
            {s.done ? (
              <span className="flex size-5 flex-none items-center justify-center rounded-full bg-brand text-white">
                <Icon name="check" size={12} strokeWidth={2.75} />
              </span>
            ) : (
              <span aria-hidden="true" className="size-5 flex-none rounded-full border-[1.5px] border-field" />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`text-sm font-medium ${s.done ? "text-muted line-through decoration-muted/50" : ""}`}>
                {s.title}
                {s.done && <span className="sr-only"> – {doneLabel}</span>}
              </span>
              <span className="truncate text-[12.5px] text-muted">{s.sub}</span>
            </span>
            {!s.done && s.action && (
              <Link
                href={s.action.href}
                className="inline-flex h-11 flex-none items-center rounded-lg border border-field bg-surface px-3.5 text-[13.5px] font-medium hover:border-ink sm:h-9"
              >
                {s.action.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
