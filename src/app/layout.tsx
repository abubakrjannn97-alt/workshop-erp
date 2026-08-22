import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstall } from "@/components/pwa-install";
import { getTranslator } from "@core/shared/i18n/locale";
import "./globals.css";

const displaySerif = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  const short = t("meta.short");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    applicationName: short,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: short,
      statusBarStyle: "black-translucent",
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: "/favicon.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0B0E1A" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0E1A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getTranslator();
  return (
    <html lang={locale === "tj" ? "tg" : "ru"} className={`${displaySerif.variable} h-full antialiased`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full bg-[var(--color-background)] font-sans text-[var(--color-text-primary)]">
        <PwaRegister />
        <PwaInstall locale={locale} />
        {children}
      </body>
    </html>
  );
}
