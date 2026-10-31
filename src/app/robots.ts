import type { MetadataRoute } from "next";
import { BRAND } from "@/config/company";

/** Production is open to search engines except the app surfaces; staging and previews are closed. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/portal", "/admin", "/email"] },
    sitemap: `${BRAND.url}/sitemap.xml`,
  };
}
