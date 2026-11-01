import "server-only";
import { headers } from "next/headers";

/** Origin the visitor sees (https://app.keyfly.app, a preview URL or http://localhost:3000). */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return { origin: `${proto}://${host}`, host };
}
