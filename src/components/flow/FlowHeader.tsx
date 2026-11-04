"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LogoFull } from "@/components/Logo";

/**
 * Header of a focused flow (App v2.3): no app navigation, only the task, its named steps and a way out.
 * From 1024 px: logo · title | stepper | Cancel. Below: back · title + "2/4 · step" · close, with a progress bar.
 * The logo goes home through `onCancel`, so a half-filled flow still asks before leaving. On the first step the
 * back arrow leaves the flow the same way. A one-page task passes no steps: title and Cancel only (canvas "Új ingatlan").
 */
export function FlowHeader({
  title,
  steps,
  current,
  labels,
  homeHref,
  onBack,
  onCancel,
}: {
  title: string;
  steps: string[];
  current: number;
  labels: { progress: string; stepOf: string; done: string; current: string; back: string; cancel: string; home: string };
  homeHref: string;
  /** The previous step; on the first step back leaves the flow (`onCancel`). */
  onBack?: () => void;
  onCancel: () => void;
}) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto hidden h-16 max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-8 lg:grid">
        <span className="flex min-w-0 items-center gap-3.5">
          <Link
            href={homeHref}
            aria-label={labels.home}
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
            className="flex-none rounded-md"
          >
            <LogoFull height={20} />
          </Link>
          <span aria-hidden="true" className="h-5 w-px bg-line" />
          <span className="truncate text-sm font-semibold">{title}</span>
        </span>
        {steps.length === 0 ? (
          <span />
        ) : (
          <ol aria-label={labels.progress} className="flex items-center gap-2.5">
          {steps.map((name, i) => {
            const done = i < current;
            const now = i === current;
            return (
              <li key={name} className="flex items-center gap-2.5" aria-current={now ? "step" : undefined}>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex size-[22px] items-center justify-center rounded-full border text-xs font-semibold tabular-nums ${done || now ? "border-ink bg-ink text-white" : "border-field bg-surface text-muted"}`}
                  >
                    {done ? <Icon name="check" size={12} strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className={`text-[13px] whitespace-nowrap ${now ? "font-semibold text-ink" : done ? "font-medium text-ink" : "font-medium text-muted"}`}>
                    {name}
                    {(done || now) && <span className="sr-only"> ({done ? labels.done : labels.current})</span>}
                  </span>
                </span>
                {i < steps.length - 1 && <span aria-hidden="true" className={`h-px w-7 ${done ? "bg-ink" : "bg-field"}`} />}
              </li>
            );
          })}
          </ol>
        )}
        <span className="flex justify-end">
          <button type="button" onClick={onCancel} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-paper">
            <Icon name="x" size={16} strokeWidth={2} />
            {labels.cancel}
          </button>
        </span>
      </div>

      {steps.length === 0 ? (
        <div className="flex h-14 items-center justify-between gap-2 pr-1.5 pl-4 lg:hidden">
          <span className="truncate text-[15px] font-semibold">{title}</span>
          <button type="button" onClick={onCancel} aria-label={labels.cancel} className="flex size-11 flex-none items-center justify-center rounded-lg hover:bg-paper">
            <Icon name="x" size={20} strokeWidth={2} />
          </button>
        </div>
      ) : (
      <div className="lg:hidden">
        <div className="flex h-14 items-center justify-between gap-2 px-1.5">
          <button type="button" onClick={onBack ?? onCancel} aria-label={labels.back} className="flex size-11 flex-none items-center justify-center rounded-lg hover:bg-paper">
            <Icon name="back" size={20} strokeWidth={2} />
          </button>
          <span className="flex min-w-0 flex-col items-center text-center">
            <span className="truncate text-sm font-semibold">{title}</span>
            <span className="text-xs text-muted tabular-nums">
              {labels.stepOf} · {steps[current]}
            </span>
          </span>
          <button type="button" onClick={onCancel} aria-label={labels.cancel} className="flex size-11 flex-none items-center justify-center rounded-lg hover:bg-paper">
            <Icon name="x" size={20} strokeWidth={2} />
          </button>
        </div>
        <div aria-hidden="true" className="flex gap-1 px-5 pb-2.5">
          {steps.map((name, i) => (
            <span key={name} className={`h-[3px] flex-1 rounded-sm ${i <= current ? "bg-ink" : "bg-line"}`} />
          ))}
        </div>
      </div>
      )}
    </header>
  );
}
