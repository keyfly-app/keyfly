import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";

export default async function UnknownPublicPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (isLocale(lang)) setRequestLocale(lang);
  notFound();
}
