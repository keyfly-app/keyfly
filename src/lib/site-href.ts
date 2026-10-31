import "server-only";
import { headers } from "next/headers";
import { hrefFor, type AppSite } from "@/lib/sites";

/** Server-side link inside an app surface, adjusted to the current host. */
export async function siteHref(site: AppSite, path: string) {
  const h = await headers();
  return hrefFor(site, path, h.get("host"));
}
