import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar, MainContent } from "@/components/layout/navbar";
import { AuthHydrator } from "@/components/auth-hydrator";
import { PresenceTracker } from "@/components/presence-tracker";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UnikTrades — Tradez plus malin. Grandissez plus fort.",
  description:
    "Faites travailler votre capital avec Smart-Invest : rendement quotidien, frais clairs et retraits USDT après KYC.",
  keywords: ["investissement", "smart-invest", "rendement", "USDT", "uniktrades"],
  icons: {
    icon: "/uniktrades-mark.png",
    apple: "/uniktrades-mark.png",
  },
};

/** Lock zoom/pinch-resize on phones so the trading UI stays fixed. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} light h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider />
        <LocaleProvider />
        <AuthHydrator />
        <PresenceTracker />
        <Navbar />
        <MainContent>{children}</MainContent>
      </body>
    </html>
  );
}
