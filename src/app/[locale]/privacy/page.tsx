import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LucarneLogo } from "@/components/brand/lucarne-mark";
import { ArrowLeft } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function PrivacyPage() {
  const locale = (await getLocale()) as Locale;
  const fr = locale === "fr";

  const sections: { h: string; p: string }[] = fr
    ? [
        {
          h: "Données collectées",
          p: "Ton courriel, ton nom d'affichage, ta photo (si tu en ajoutes une) et tes pronostics. C'est tout ce dont l'app a besoin pour fonctionner.",
        },
        {
          h: "Paiement",
          p: "Le paiement d'accès est traité par Stripe. Nous ne voyons ni ne stockons jamais ton numéro de carte — Stripe s'en charge de façon sécurisée.",
        },
        {
          h: "Hébergement",
          p: "Tes données sont hébergées chez Supabase et Vercel. Elles ne sont ni vendues, ni partagées avec des tiers à des fins publicitaires.",
        },
        {
          h: "Visibilité",
          p: "Lucarne est privé, sur invitation. Tes pronostics restent cachés des autres membres jusqu'au coup d'envoi de chaque match.",
        },
        {
          h: "Tes droits",
          p: "Tu peux demander la correction ou la suppression de tes données à tout moment via la page Support.",
        },
      ]
    : [
        {
          h: "Data we collect",
          p: "Your email, display name, photo (if you add one) and your predictions. That's all the app needs to work.",
        },
        {
          h: "Payment",
          p: "The access payment is processed by Stripe. We never see or store your card number — Stripe handles it securely.",
        },
        {
          h: "Hosting",
          p: "Your data is hosted on Supabase and Vercel. It is never sold or shared with third parties for advertising.",
        },
        {
          h: "Visibility",
          p: "Lucarne is private and invite-only. Your predictions stay hidden from other members until each match kicks off.",
        },
        {
          h: "Your rights",
          p: "You can request correction or deletion of your data at any time via the Support page.",
        },
      ];

  return (
    <main className="relative mx-auto min-h-dvh max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <LucarneLogo label="Lucarne" markClassName="size-7" textClassName="text-base" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition hover:text-text-primary"
        >
          <ArrowLeft className="size-4" />
          {fr ? "Accueil" : "Home"}
        </Link>
      </div>

      <h1 className="font-display text-3xl font-bold text-text-primary">
        {fr ? "Confidentialité" : "Privacy"}
      </h1>

      <div className="mt-8 space-y-7">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {s.h}
            </h2>
            <p className="mt-1.5 text-sm leading-7 text-text-secondary">{s.p}</p>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-white/[0.08] pt-6 text-xs text-text-tertiary">
        {fr ? "Une question sur tes données ? " : "A question about your data? "}
        <Link href="/support" className="font-semibold text-primary-400 hover:text-primary-300">
          {fr ? "Contacte le support" : "Contact support"}
        </Link>
        .
      </p>
    </main>
  );
}
