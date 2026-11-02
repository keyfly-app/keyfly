/**
 * Trusted devices (canvas "Biztonságos eszközök"): after the two-step code a browser may skip it for 30 days.
 * The cookie holds "<row id>.<random token>"; the database keeps only the token's SHA-256 hash.
 * Shared by the proxy and server actions, so it uses Web Crypto only.
 */
export const TRUSTED_COOKIE = "kf_trusted";
export const TRUSTED_DAYS = 30;

export function parseTrusted(value: string | undefined): { id: string; token: string } | null {
  const m = value?.match(/^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/);
  return m ? { id: m[1], token: m[2] } : null;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
