/** Stroke icons used across Keyfly surfaces (24×24 grid, decorative by default). */
const PATHS = {
  camera: (
    <>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  laptop: (
    <>
      <rect x="4.5" y="5" width="15" height="10.5" rx="1.5" />
      <path d="M2.5 19h19" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.3 2-2.3 3.5M12 17v.5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  send: (
    <>
      <path d="M21 3 10 14" />
      <path d="m21 3-7 18-4-7-7-4z" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  layout: (
    <>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7.5h15a3 3 0 0 1 3 3V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 7.5 15 4v3.5" />
      <circle cx="16.5" cy="14" r="1.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z" />
      <path d="m8.8 12.2 2.3 2.3 4.3-4.6" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
      <path d="M3 20h18" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="m9 14.5 2 2 4-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8.2-8.2M16 7l2.5 2.5M14 9l1.5 1.5" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 9h3a1 1 0 0 1 1 1v11" />
      <path d="M8 7h4M8 11h4M8 15h4M3 21h18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.01" />
    </>
  ),
  back: <path d="m14 7-5 5 5 5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  sparkle: <path d="M12 3.5l2 5.4 5.5 2.1-5.5 2.1-2 5.4-2-5.4-5.5-2.1 5.5-2.1z" />,
  map: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 16a8 8 0 1 1 16 0" />
      <path d="m12 16 4-5" />
      <circle cx="12" cy="16" r="1.3" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L4 16.7 7.3 20l5.3-5.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1" />
      <circle cx="3.5" cy="12" r="1" />
      <circle cx="3.5" cy="18" r="1" />
    </>
  ),
  store: (
    <>
      <path d="M4 9.5 5.5 4h13L20 9.5" />
      <path d="M4 9.5h16v1a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3 0z" />
      <path d="M5.5 12.5V20h13v-7.5" />
    </>
  ),
  cup: (
    <>
      <path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M5 21h11" />
    </>
  ),
  box: (
    <>
      <path d="M3.5 8 12 4l8.5 4v11.5h-17z" />
      <path d="M8 19.5v-7h8v7M8 15.5h8" />
    </>
  ),
  car: (
    <>
      <path d="M4.5 15 6.5 9h11l2 6" />
      <rect x="3" y="15" width="18" height="4.5" rx="1.2" />
      <circle cx="7.5" cy="19.5" r="1.2" />
      <circle cx="16.5" cy="19.5" r="1.2" />
    </>
  ),
  storage: (
    <>
      <rect x="3.5" y="4.5" width="17" height="4" rx="1" />
      <path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5M10 12.5h4" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  alarm: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z" />
      <circle cx="12" cy="11.5" r="2" />
    </>
  ),
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  drop: <path d="M12 3.5c3.3 4 5.5 7.2 5.5 10a5.5 5.5 0 0 1-11 0c0-2.8 2.2-6 5.5-10z" />,
  flame: <path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 3-5.4 3.6-9.4 2.6 1.7 4.2 4.1 4.4 6.6.8-.7 1.3-1.8 1.4-3 1.6 1.6 2.6 3.6 2.6 5.8 0 3.2-2.4 5.6-6 5.6z" />,
  leaf: (
    <>
      <path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15" />
      <path d="M5 19c3-4 6-6 10-8" />
    </>
  ),
  pause: (
    <>
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5z" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  thermo: (
    <>
      <path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z" />
      <path d="M12 9v7" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="5.5" width="18" height="12" rx="2" />
      <path d="M8 21h8" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a14 14 0 0 1 19 0" />
      <path d="M5.5 12.5a9.5 9.5 0 0 1 13 0" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m20.5 16-5-5-8.5 8.5" />
    </>
  ),
  star: <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 24,
  strokeWidth = 1.8,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

/** For icon names that come from data (e.g. the catalogue): unknown names fall back to the caller's default. */
export const isIconName = (value: unknown): value is IconName => typeof value === "string" && Object.hasOwn(PATHS, value);
