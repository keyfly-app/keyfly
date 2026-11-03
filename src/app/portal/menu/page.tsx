import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/Shell";
import { MenuPage } from "@/features/settings/MenuPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("menu");
  return { title: t("title"), robots: { index: false } };
}

/** The phone Menu of the personal account (the bottom bar's "Menü"). */
export default function Menu() {
  return (
    <Shell>
      <MenuPage />
    </Shell>
  );
}
