import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { RootDocument } from "@/components/RootDocument";
import { isLocale } from "@/i18n/config";

/** Root layout for the signed-in surfaces (app., admin.). Language comes from the saved choice. */
export async function AppRootLayout({ children }: { children: React.ReactNode }) {
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  return (
    <RootDocument locale={locale}>
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </RootDocument>
  );
}
