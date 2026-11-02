/** "2/4" in a thin ring: how many setup steps are done (canvas v2.4 "Fiókod beállítása"). */
export function ProgressRing({ done, total, label, size = 36 }: { done: number; total: number; label: string; size?: number }) {
  const stroke = size < 34 ? 3 : 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span role="img" aria-label={label} className="relative inline-flex flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * done) / Math.max(total, 1)} ${c}`}
          className="stroke-brand"
        />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
        {done}/{total}
      </span>
    </span>
  );
}
