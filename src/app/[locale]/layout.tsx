import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lucarne.ca"),
  title: {
    default: "Lucarne",
    template: "%s · Lucarne",
  },
  description:
    "Plateforme privée de pronostics pour la Coupe du Monde 2026 : achète ta place, parie sur les 104 matchs, top 3 partage la cagnotte.",
  applicationName: "Lucarne",
  authors: [{ name: "Lucarne" }],
  openGraph: {
    title: "Lucarne · Pronostics privés pour le Mondial 2026",
    description:
      "Une seule place à acheter, accès à tous les pronostics du Mondial 2026, top 3 du classement se partage la cagnotte.",
    type: "website",
    images: [
      {
        url: "/marketing/lucarne-hero-stadium.jpg",
        width: 1672,
        height: 941,
        alt: "Interface Lucarne dans un stade de football nocturne.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lucarne · Pronostics privés pour le Mondial 2026",
    description:
      "Ligues privées, achat de place unique, classements et cagnotte réelle pour le Mondial 2026.",
    images: ["/marketing/lucarne-hero-stadium.jpg"],
  },
  appleWebApp: {
    title: "Lucarne",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1014",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${bricolage.variable} ${inter.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
