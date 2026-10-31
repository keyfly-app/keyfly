import "server-only";
import { headers } from "next/headers";
import { hrefFor, type Site } from "@/lib/sites";

/** Szerveroldali link a megadott felületen belül, az aktuális domainhez igazítva. */
export async function siteHref(site: Exclude<Site, "marketing">, path: string) {
  const h = await headers();
  return hrefFor(site, path, h.get("host"));
}
