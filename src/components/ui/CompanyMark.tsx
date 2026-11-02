/**
 * A company's mark (canvas v2.5 "Céglogó"): its uploaded logo on a rounded square, or its initials in lime on deep
 * green. Decorative: the company's name is always next to it.
 */
export function CompanyMark({
  logoUrl,
  initials,
  size = 32,
  className = "",
}: {
  logoUrl?: string | null;
  initials: string;
  size?: number;
  className?: string;
}) {
  const style = {
    width: size,
    height: size,
    fontSize: Math.max(8, Math.round(size * 0.36)),
  };
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link; next/image would cache it past expiry
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        style={{ ...style, borderRadius: Math.max(4, Math.round(size / 4)) }}
        className={`flex-none border border-line bg-surface object-contain ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`flex flex-none items-center justify-center rounded-full bg-brand-deep font-semibold text-lime ${className}`}
    >
      {initials}
    </span>
  );
}
