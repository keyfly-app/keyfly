import { useTranslations } from "next-intl";
import { Icon } from "@/components/Icon";

export type TimelineState = "done" | "now" | "todo" | "err";
export type TimelineItem = { state: TimelineState; title: string; sub?: string };

const DOT: Record<TimelineState, string> = {
  done: "bg-ink text-white",
  now: "border-[1.5px] border-warning-ink bg-warning-soft",
  err: "border-[1.5px] border-danger-ink bg-danger-soft text-danger-ink",
  todo: "border-[1.5px] border-field bg-surface",
};

/**
 * Vertical status timeline (App v2.3): what happened, where it stands now, what comes next.
 * The state is in the text too (screen readers), not only in the dot's colour.
 */
export function Timeline({ items, compact = false }: { items: TimelineItem[]; compact?: boolean }) {
  const t = useTranslations("common.timeline");
  return (
    <ol className="flex flex-col">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <li key={item.title} className="flex gap-3.5" aria-current={item.state === "now" ? "step" : undefined}>
            <span aria-hidden="true" className="flex flex-col items-center">
              <span className={`flex size-6 flex-none items-center justify-center rounded-full ${DOT[item.state]}`}>
                {item.state === "done" && <Icon name="check" size={13} strokeWidth={2.5} />}
                {item.state === "now" && <span className="size-2 rounded-full bg-warning-ink" />}
                {item.state === "err" && <Icon name="x" size={12} strokeWidth={2.5} />}
              </span>
              {!last && <span className={`my-1 min-h-5 w-0.5 flex-1 rounded-full ${item.state === "done" ? "bg-ink" : "bg-line"}`} />}
            </span>
            <span className={`flex min-w-0 flex-col gap-0.5 pt-0.5 ${last ? "" : compact ? "pb-3" : "pb-4"}`}>
              <span className={`text-sm font-semibold ${item.state === "todo" ? "text-muted" : "text-ink"}`}>
                <span className="sr-only">{t(item.state)}: </span>
                {item.title}
              </span>
              {item.sub && <span className="text-[13px] leading-[18px] text-muted [overflow-wrap:anywhere]">{item.sub}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
