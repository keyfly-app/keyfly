/** "Chrome · macOS" from a user agent string – enough to recognise one's own devices; never shown to anyone else. */
export function describeDevice(ua: string | null): { browser: string; os: string; mobile: boolean } | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : null;
  if (!browser && !os) return null;
  return { browser: browser ?? "Browser", os: os ?? "", mobile: /iPhone|Android.+Mobile/.test(ua) };
}
