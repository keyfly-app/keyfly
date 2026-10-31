import "@fontsource-variable/inter";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@/app/globals.css";
import type { Locale } from "@/i18n/config";

/** <html>/<body> shell shared by every root layout (public site, app, admin). */
export function RootDocument({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <html lang={locale}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
