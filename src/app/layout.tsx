import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import PwaProvider from "@/components/PwaProvider";
import { getLocale, messages } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
});

export const viewport: Viewport = {
  themeColor: "#065f46",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "The Village Vet",
  description: "Appointments, pet records, and the clinic shop.",
  applicationName: "The Village Vet",
  appleWebApp: {
    capable: true,
    title: "Village Vet",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const copy = messages(locale);
  const vapid = process.env.VAPID_PUBLIC_KEY ?? "";

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${geistMono.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className={`flex min-h-full flex-col ${locale === "ar" ? "font-[family-name:var(--font-arabic)]" : ""}`}>
        {vapid ? <meta name="village-vet-vapid" content={vapid} /> : null}
        <PwaProvider copy={copy} />
        {children}
      </body>
    </html>
  );
}
