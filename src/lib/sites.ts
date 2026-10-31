/**
 * One codebase, three surfaces – the host decides which one is served.
 *
 *   keyfly.app, www.keyfly.app, staging.keyfly.app   → "marketing"  (src/app/(marketing)/[lang])
 *   app.keyfly.app,   app-staging.keyfly.app         → "portal"     (src/app/portal)
 *   admin.keyfly.app, admin-staging.keyfly.app       → "admin"      (src/app/admin)
 *
 * Local development: localhost:3000, app.localhost:3000, admin.localhost:3000.
 * On Vercel preview URLs (*.vercel.app) the app surfaces are reachable at /portal and /admin.
 */
export type Site = "marketing" | "portal" | "admin";
export type AppSite = Exclude<Site, "marketing">;

export const SITE_PATH_PREFIX: Record<AppSite, string> = {
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

/** Preview / development hosts where app surfaces are also reachable by path. */
export function isPreviewHost(host: string | null): boolean {
  const h = (host ?? "").toLowerCase().split(":")[0];
  return h.endsWith(".vercel.app") || h === "localhost" || h === "127.0.0.1";
}

/** Link inside an app surface: "/x" on its own subdomain, "/portal/x" or "/admin/x" on a preview URL. */
export function hrefFor(site: AppSite, path: string, host: string | null): string {
  return resolveSite(host) === site ? path : SITE_PATH_PREFIX[site] + (path === "/" ? "" : path);
}
