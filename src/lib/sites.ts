/**
 * Egy kódbázis, három felület – a domain dönti el, melyik jelenik meg.
 *
 *   keyfly.app, www.keyfly.app, staging.keyfly.app   → "marketing"  (src/app/(marketing))
 *   app.keyfly.app,   app-staging.keyfly.app         → "portal"     (src/app/portal)
 *   admin.keyfly.app, admin-staging.keyfly.app       → "admin"      (src/app/admin)
 *
 * Helyi fejlesztés: localhost:3000, app.localhost:3000, admin.localhost:3000
 * Vercel előnézeti linkeken (*.vercel.app) a /portal és /admin útvonalak közvetlenül is elérhetők.
 */
export type Site = "marketing" | "portal" | "admin";

export const SITE_PATH_PREFIX: Record<Exclude<Site, "marketing">, string> = {
  portal: "/portal",
  admin: "/admin",
};

export const PRODUCTION_HOSTS = {
  marketing: "keyfly.app",
  portal: "app.keyfly.app",
  admin: "admin.keyfly.app",
} as const;

export function resolveSite(host: string | null): Site {
  const h = (host ?? "").toLowerCase().split(":")[0];
  if (h.startsWith("app.") || h.startsWith("app-staging.")) return "portal";
  if (h.startsWith("admin.") || h.startsWith("admin-staging.")) return "admin";
  return "marketing";
}

/** Előnézeti / fejlesztői host, ahol a felületek útvonallal is elérhetők. */
export function isPreviewHost(host: string | null): boolean {
  const h = (host ?? "").toLowerCase().split(":")[0];
  return h.endsWith(".vercel.app") || h === "localhost" || h === "127.0.0.1";
}

/**
 * Felületen belüli link: a saját aldomainen "/x", előnézeti linken "/portal/x" vagy "/admin/x".
 */
export function hrefFor(site: Exclude<Site, "marketing">, path: string, host: string | null): string {
  return resolveSite(host) === site ? path : SITE_PATH_PREFIX[site] + (path === "/" ? "" : path);
}
