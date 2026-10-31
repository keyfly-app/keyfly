import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppRootLayout } from "@/components/AppRootLayout";
import { baseMetadata, baseViewport } from "@/lib/metadata";

export const viewport = baseViewport;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return baseMetadata(t("title"), t("description"));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppRootLayout>{children}</AppRootLayout>;
}
