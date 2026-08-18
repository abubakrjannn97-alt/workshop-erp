import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstall } from "@/components/pwa-install";
import { getTranslator } from "@core/shared/i18n/locale";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: t("meta.short"), statusBarStyle: "black-translucent" },
    icons: {
      icon: [
        { url: "/favicon.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0B0E1A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getTranslator();
  return (
    <html lang={locale === "tj" ? "tg" : "ru"} className="h-full antialiased">
      <body className="min-h-full bg-[var(--color-background)] font-sans text-[var(--color-text-primary)]">
        <PwaRegister />
        <PwaInstall locale={locale} />
        {children}
      </body>
    </html>
  );
}
