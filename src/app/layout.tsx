import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "./globals.css";

const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";

export const metadata: Metadata = {
  metadataBase: new URL("https://keyfly.app"),
  title: { default: "Keyfly – Költözz be kaució nélkül", template: "%s · Keyfly" },
  description:
    "A Keyfly kiváltja a lakásbérlési kauciót: neked nem kell milliókat félretenned, a bérbeadód pedig ugyanúgy biztonságban van.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    locale: "hu_HU",
    siteName: "Keyfly",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  // Staging és előnézet soha ne kerüljön be a keresőkbe.
  robots: isProduction ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0E5A43" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
