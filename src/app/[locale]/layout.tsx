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
    "Lucarne — l'app privée pour vivre la Coupe du Monde 2026 entre amis : tous les matchs, scores en direct, news et analyses, et un concours de pronostics amical.",
  applicationName: "Lucarne",
  authors: [{ name: "Lucarne" }],
  openGraph: {
    title: "Lucarne · Ton app privée pour le Mondial 2026",
    description:
      "Accès privé à la Coupe du Monde 2026 : tous les matchs, scores en direct, news et analyses, et un concours de pronostics entre amis.",
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
    title: "Lucarne · Ton app privée pour le Mondial 2026",
    description:
      "Accès privé à la Coupe du Monde 2026 : matchs, scores en direct, news, analyses et concours de pronos entre amis.",
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
