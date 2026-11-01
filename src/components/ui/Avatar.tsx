/** Profile photo, or the person's initials on a soft green disc. Decorative: the name is always next to it. */
export function Avatar({ src, initials, size = 32 }: { src?: string | null; initials: string; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link; next/image would cache it past expiry
    return <img src={src} alt="" width={size} height={size} style={style} className="flex-none rounded-full object-cover" />;
  }
  return (
    <span aria-hidden="true" style={style} className="flex flex-none items-center justify-center rounded-full bg-mist font-semibold text-brand">
      {initials}
    </span>
  );
}
