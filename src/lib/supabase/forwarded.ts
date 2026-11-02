/**
 * Visitor IP forwarding for Supabase Auth rate limits (Authentication → Rate Limits → IP address forwarding).
 * Shared by the server clients and the proxy; no server-only import, so the proxy can use it too.
 */

/** The project's secret key (sb_secret_…), or null when it is missing or not a secret key. */
export function secretKey(): string | null {
  const secret = process.env.SUPABASE_SECRET_KEY;
  return secret?.startsWith("sb_secret_") ? secret : null;
}

/** The visitor's address as Vercel reports it: the first x-forwarded-for entry, else x-real-ip. */
export function clientIp(h: { get(name: string): string | null }): string | null {
  const first = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = first || h.get("x-real-ip")?.trim();
  return ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}
