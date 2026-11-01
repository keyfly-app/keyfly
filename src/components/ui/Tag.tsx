/** Status tag (App v2.2): small, quiet, always text and colour together. */
const TONE = {
  ok: "bg-ok-soft text-ok-ink",
  warning: "bg-warning-soft text-warning-ink",
  info: "bg-info-soft text-info-ink",
  danger: "bg-danger-soft text-danger-ink",
  neutral: "bg-paper text-ink-soft",
} as const;
export type TagTone = keyof typeof TONE;

export function Tag({ tone, children }: { tone: TagTone; children: React.ReactNode }) {
  return <span className={`inline-flex h-[22px] flex-none items-center self-start rounded-md px-2 text-xs font-medium whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}
