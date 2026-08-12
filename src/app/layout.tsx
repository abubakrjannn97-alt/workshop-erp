import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { getLocale } from "@/lib/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "Производственный цех",
  description: "Система полной автоматизации производственного цеха",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Цех", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#4F565D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale === "tj" ? "tg" : "ru"} className="h-full antialiased">
      <body className="min-h-full">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
