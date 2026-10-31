import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RootDocument } from "@/components/RootDocument";
import { isLocale, LOCALES } from "@/i18n/config";
import { baseMetadata, baseViewport } from "@/lib/metadata";

export const viewport = baseViewport;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "meta" });
  return baseMetadata(t("title"), t("description"));
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  return (
    <RootDocument locale={lang}>
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </RootDocument>
  );
}
