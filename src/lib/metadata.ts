import type { Metadata, Viewport } from "next";
import { BRAND } from "@/config/company";

const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";

export const baseViewport: Viewport = { themeColor: BRAND.themeColor };

/** Metadata shared by every surface. Staging and previews are never indexed. */
export function baseMetadata(title: string, description: string): Metadata {
  return {
    metadataBase: new URL(BRAND.url),
    title: { default: title, template: `%s · ${BRAND.name}` },
    description,
    icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
    openGraph: { type: "website", siteName: BRAND.name, images: [{ url: "/og.png", width: 1200, height: 630 }] },
    robots: isProduction ? undefined : { index: false, follow: false },
  };
}
