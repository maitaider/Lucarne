import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LucarneLogo } from "@/components/brand/lucarne-mark";
import { ArrowLeft } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function RulesPage() {
  const locale = (await getLocale()) as Locale;
  const fr = locale === "fr";

  const sections: { h: string; p: string }[] = fr
    ? [
        {
          h: "1. Ce qu'est Lucarne",
          p: "Lucarne est une application privée, sur invitation, pour vivre la Coupe du Monde 2026 entre amis : calendrier des 104 matchs, scores en direct, dernières nouvelles et analyses, et un concours de pronostics amical. Ce n'est pas un service de paris ouvert au public.",
        },
        {
          h: "2. L'accès",
          p: "L'accès complet à l'application coûte 20 $ CA, un paiement unique pour toute la durée du tournoi, réglé de façon sécurisée par Stripe. Environ 6 % couvrent les frais de paiement Stripe et d'hébergement ; le reste alimente la cagnotte du groupe. Plus il y a de membres, plus la cagnotte grandit.",
        },
        {
          h: "3. Le concours de pronostics",
          p: "Le concours est gratuit et basé sur l'adresse : aucune mise, aucun jeton, rien à perdre. Tu pronostiques le score de chaque match (bon vainqueur, bon total de buts, score exact — cumulables jusqu'à 12 points par match) et tu bâtis ta phase finale, elle aussi notée (des points par équipe que tu envoies à chaque tour, et un gros bonus pour le champion, le finaliste et le 3ᵉ). Tout se remplit jusqu'à 1 h avant le coup d'envoi du 1ᵉʳ match, puis se verrouille. Le classement se fait sur le total de points.",
        },
        {
          h: "4. Le pot commun du groupe",
          p: "Une partie des accès alimente un pot commun. En fin de tournoi, l'organisateur peut le répartir, à l'amiable, entre les membres les mieux classés. Il s'agit d'une entente amicale et privée entre personnes qui se connaissent, laissée à la discrétion de l'organisateur — ce n'est ni un prix garanti, ni une loterie, ni un service de jeu d'argent. La participation se fait à titre récréatif.",
        },
        {
          h: "5. Caractère privé",
          p: "L'inscription se fait uniquement par code d'invitation. Lucarne est volontairement réservé à un cercle privé. Tes pronostics ne sont visibles par personne avant le coup d'envoi de chaque match.",
        },
        {
          h: "6. Admissibilité & jeu responsable",
          p: "Tu dois avoir l'âge de la majorité dans ta province (18 ans au Québec) pour participer. Participe pour le plaisir et la rivalité amicale. Pour toute question, contacte l'administrateur via la page Support.",
        },
      ]
    : [
        {
          h: "1. What Lucarne is",
          p: "Lucarne is a private, invite-only app to follow the 2026 World Cup with friends: the 104-match schedule, live scores, latest news and analysis, and a friendly prediction game. It is not a betting service open to the public.",
        },
        {
          h: "2. Access",
          p: "Full access to the app is CA$20, a one-time payment for the whole tournament, processed securely by Stripe. About 6% covers Stripe processing and hosting; the rest funds the group pot. The more members, the bigger the pot.",
        },
        {
          h: "3. The prediction game",
          p: "The game is free and skill-based: no stake, no tokens, nothing to lose. You predict each match's score (correct winner, correct total goals, exact score — stacking up to 12 points per match) and build your knockout bracket, which is also scored (points for every team you send to each round, plus a big bonus for the champion, runner-up and 3rd place). Everything stays open until 1 h before the first match kicks off, then locks. Standings are based on total points.",
        },
        {
          h: "4. The group pot",
          p: "Part of the access fees forms a common pot. At the end of the tournament, the organizer may share it, informally, among the top-ranked members. It is a friendly, private arrangement between people who know each other, at the organizer's discretion — not a guaranteed prize, a lottery, or a money-gambling service. Participation is purely recreational.",
        },
        {
          h: "5. Private by design",
          p: "Sign-up is by invitation code only. Lucarne is intentionally limited to a private circle. Your predictions are hidden from everyone until each match kicks off.",
        },
        {
          h: "6. Eligibility & responsible play",
          p: "You must be of the age of majority in your province (18 in Québec) to take part. Play for fun and friendly rivalry. For any question, contact the admin via the Support page.",
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
        {fr ? "Règlement" : "Rules"}
      </h1>
      <p className="mt-2 text-sm text-text-tertiary">
        {fr
          ? "Comment fonctionne Lucarne — accès, concours de pronostics, cagnotte."
          : "How Lucarne works — access, prediction game, pot."}
      </p>

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

      <p className="mt-10 border-t border-white/[0.08] pt-6 text-xs leading-6 text-text-tertiary">
        {fr
          ? "Lucarne est un projet privé entre connaissances et n'est pas un opérateur de jeu commercial. En cas de doute sur ta situation, renseigne-toi auprès des autorités de ta province. Une question ? "
          : "Lucarne is a private project among acquaintances and is not a commercial gambling operator. If in doubt about your situation, check with your provincial authorities. A question? "}
        <Link href="/support" className="font-semibold text-primary-400 hover:text-primary-300">
          {fr ? "Contacte le support" : "Contact support"}
        </Link>
        .
      </p>
    </main>
  );
}
