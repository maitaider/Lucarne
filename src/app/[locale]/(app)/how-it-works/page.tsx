import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/reveal";
import {
  getAppSettings,
  formatMoney,
  effectiveBuyInDeadline,
} from "@/lib/admin/economy";
import {
  ArrowRight,
  CalendarClock,
  Crown,
  HelpCircle,
  ListOrdered,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Target,
  Ticket,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const settings = await getAppSettings();
  const moneyLocale = L === "fr" ? "fr-CA" : "en-CA";
  const buyInLabel = formatMoney(
    settings.buy_in_amount_cents,
    settings.currency,
    moneyLocale,
  );
  const lockAt = effectiveBuyInDeadline(settings);
  const lockLabel = lockAt.toLocaleString(moneyLocale, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const tournamentStart = new Date(
    settings.tournament_start_at,
  ).toLocaleDateString(moneyLocale, { day: "numeric", month: "long" });
  const tournamentEnd = new Date(
    settings.tournament_end_at,
  ).toLocaleDateString(moneyLocale, { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="relative">
      {/* Ambient stadium backdrop behind the whole guide */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <Image
          src="/assets/lucarne/world-cup-2026/09-stadium-supporters-sunset.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top opacity-[0.10]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,5,0.82)_0%,rgba(5,6,5,0.95)_55%,rgba(5,6,5,0.99)_100%)]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <header className="relative mb-8 overflow-hidden rounded-md border border-white/[0.13] bg-abyss/[0.8] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-8">
        <Image
          src="/marketing/lucarne-hero-stadium.jpg"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-[60%_44%] opacity-[0.18]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(96deg,rgba(5,6,5,0.94)_0%,rgba(5,6,5,0.78)_44%,rgba(5,6,5,0.5)_100%)]" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-sm border border-primary-500/35 bg-primary-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-300">
            <HelpCircle className="size-3.5" strokeWidth={1.7} />
            {L === "fr" ? "Le guide" : "The guide"}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            {L === "fr"
              ? "Comment marche Lucarne"
              : "How Lucarne works"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {L === "fr"
              ? `Un seul paiement pour l'accès, deux niveaux de pronostic, et un pot commun qui récompense les meilleurs entre amis. Tournoi du ${tournamentStart} au ${tournamentEnd}.`
              : `One payment for access, two levels of prediction, and a group pot that rewards the best among friends. Tournament runs ${tournamentStart} to ${tournamentEnd}.`}
          </p>
        </div>
      </header>

      <ol className="space-y-4">
        <Reveal>
          <Step
            n={1}
            icon={Ticket}
            accent="gold"
            title={L === "fr" ? "Achète ta place" : "Buy your seat"}
            body={
              L === "fr"
                ? `Une seule fois. ${buyInLabel} via Stripe, débloque l'accès complet aux pronos sur les 104 matchs. Fenêtre d'achat jusqu'au ${lockLabel}. Pas d'abonnement.`
                : `One-time. ${buyInLabel} via Stripe, unlocks full picking on all 104 matches. Sales open until ${lockLabel}. No subscription.`
            }
            cta={{
              href: "/buy-in",
              label: L === "fr" ? "Acheter ma place" : "Buy my seat",
            }}
          />
        </Reveal>

        <Reveal delayMs={90}>
          <Step
            n={2}
            icon={Sparkles}
            accent="primary"
            title={
              L === "fr"
                ? "Pronostique les matchs de groupe"
                : "Predict the group matches"
            }
            body={
              L === "fr"
                ? "Pour chaque match, entre le score des deux équipes (ex. 2-1). Le classement de chaque groupe se calcule tout seul à partir de tes résultats."
                : "For each match, enter both teams' score (e.g. 2-1). Each group's standings are computed automatically from your results."
            }
            cta={{
              href: "/predict?tab=groupes",
              label: L === "fr" ? "Pronostiquer les groupes" : "Predict groups",
            }}
            bullets={
              L === "fr"
                ? [
                    "Les 2 premiers de chaque groupe se qualifient",
                    "Plus les 8 meilleurs 3ᵉ (repêchage)",
                    "Égalités tranchées au goal-average",
                  ]
                : [
                    "Top 2 of each group qualify",
                    "Plus the 8 best third-placed (playoff)",
                    "Ties broken on goal difference",
                  ]
            }
          />
        </Reveal>

        <Reveal delayMs={180}>
          <Step
            n={3}
            icon={Trophy}
            accent="gold"
            title={L === "fr" ? "Bâtis ta phase finale" : "Build your bracket"}
            body={
              L === "fr"
                ? "L'arbre se remplit depuis tes groupes. Tape l'équipe qui passe à chaque tour — de gauche à droite — jusqu'à ton champion. Re-tape pour annuler. C'est noté : des points par bonne équipe à chaque tour + un gros lot pour le podium (barème ci-dessous)."
                : "The bracket fills from your groups. Tap the team that advances each round — left to right — to your champion. Re-tap to cancel. It's scored: points per correct team each round + a big bonus for the podium (breakdown below)."
            }
            cta={{
              href: "/predict?tab=finale",
              label: L === "fr" ? "Ouvrir la phase finale" : "Open knockouts",
            }}
          />
        </Reveal>

        <Reveal delayMs={270}>
          <Step
            n={4}
            icon={Target}
            accent="violet"
            title={
              L === "fr" ? "Points automatiques" : "Automatic points"
            }
            body={
              L === "fr"
                ? "Dès qu'un match est terminé, le moteur lit le score et clôture tes pronostics — aucun admin à attendre. Barème ci-dessous."
                : "As soon as a match ends, the engine reads the score and settles your predictions — no admin wait. Scoring below."
            }
          />
        </Reveal>
      </ol>

      {/* Scoring breakdown */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-text-primary">
          <ListOrdered className="size-5 text-primary-400" strokeWidth={1.7} />
          {L === "fr" ? "Barème de points" : "Points breakdown"}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreCard
            icon={MousePointerClick}
            title={L === "fr" ? "Vainqueur du match" : "Match winner"}
            value="+3"
            sub={L === "fr" ? "par bon 1/N/2" : "per correct 1/N/2"}
            accent="primary"
          />
          <ScoreCard
            icon={Target}
            title={L === "fr" ? "Total de buts" : "Total goals"}
            value="+5"
            sub={L === "fr" ? "si exact · +2 si ±1" : "exact · +2 if within 1"}
            accent="gold"
          />
          <ScoreCard
            icon={Zap}
            title={L === "fr" ? "Score exact" : "Exact score"}
            value="+5"
            sub={L === "fr" ? "le score pile" : "the exact scoreline"}
            accent="violet"
          />
        </div>

        <div className="mt-4 space-y-3">
          {/* Cumulative model */}
          <div className="rounded-[10px] border border-primary-500/25 bg-primary-500/[0.07] p-4 text-xs leading-6 text-text-secondary backdrop-blur-xl">
            <p className="mb-1 font-semibold text-text-primary">
              {L === "fr"
                ? "Un seul pronostic de score = jusqu'à 3 gains cumulés"
                : "One score pick = up to 3 stacked rewards"}
            </p>
            {L === "fr"
              ? "Quand tu pronostiques un score (ex. 2-1), dès que le match est terminé tu marques tout ce qui est juste, en même temps : le bon vainqueur (+3), le bon total de buts (+5 si exact, +2 à ±1), et le score exact (+5). Cumulés, jusqu'à +13 points sur un seul match — pas besoin de tomber pile pour marquer."
              : "When you predict a score (e.g. 2-1), once the match ends you earn everything that's right, all at once: the correct winner (+3), the correct total goals (+5 exact, +2 within 1), and the exact score (+5). Stacked, up to +13 on a single match — you don't need the exact score to score."}
          </div>

          {/* Worked example */}
          <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.5] p-4 backdrop-blur-xl">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {L === "fr"
                ? "Exemple — tu pronostiques 2-1"
                : "Example — you predict 2-1"}
            </p>
            <ul className="space-y-1.5 text-xs leading-5 text-text-secondary">
              <li className="flex items-baseline justify-between gap-3">
                <span>{L === "fr" ? "Résultat 2-1 — vainqueur + total + exact" : "Result 2-1 — winner + total + exact"}</span>
                <b className="shrink-0 tabular-nums text-primary-300">13 pts</b>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>{L === "fr" ? "Résultat 3-0 — vainqueur + total (3)" : "Result 3-0 — winner + total (3)"}</span>
                <b className="shrink-0 tabular-nums text-primary-300">8 pts</b>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>{L === "fr" ? "Résultat 1-0 — bon vainqueur seulement" : "Result 1-0 — winner only"}</span>
                <b className="shrink-0 tabular-nums text-primary-300">3 pts</b>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>{L === "fr" ? "Résultat 0-1 — mauvais vainqueur, total trop loin" : "Result 0-1 — wrong winner, total too far"}</span>
                <b className="shrink-0 tabular-nums text-text-tertiary">0 pt</b>
              </li>
            </ul>
          </div>

          {/* Knockout (bracket) scoring */}
          <div className="rounded-[10px] border border-gold-500/25 bg-gold-500/[0.06] p-4 text-xs leading-6 text-text-secondary backdrop-blur-xl">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-text-primary">
              <Trophy className="size-3.5 text-gold-400" strokeWidth={2} />
              {L === "fr"
                ? "Phase finale — ton arbre est aussi noté"
                : "Knockouts — your bracket is scored too"}
            </p>
            {L === "fr"
              ? "Pour chaque équipe que tu envoies au bon tour : 8ᵉˢ +1 · quarts +3 · demies +6 · finale +10. Et le gros lot du podium : champion +30 · finaliste +20 · 3ᵉ place +15. Plus ton arbre colle à la réalité, plus tu marques."
              : "For each team you send to the right round: Round of 16 +1 · quarters +3 · semis +6 · final +10. Plus the podium jackpot: champion +30 · runner-up +20 · 3rd place +15. The closer your bracket is to reality, the more you score."}
          </div>

        </div>
      </section>

      {/* Detailed worked example — a full run to the trophy */}
      <section className="relative mt-10 overflow-hidden rounded-[14px] border border-gold-500/30 bg-abyss/[0.7] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.4)] sm:p-7">
        <Image
          src="/assets/lucarne/world-cup-2026/04-argentina-net-shot.png"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-[72%_28%] opacity-[0.16]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(118deg,rgba(5,6,5,0.96)_0%,rgba(5,6,5,0.82)_52%,rgba(5,6,5,0.58)_100%)]" />

        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-sm border border-gold-500/35 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-300">
            <Trophy className="size-3.5" strokeWidth={1.7} />
            {L === "fr" ? "Exemple complet" : "Full example"}
          </div>
          <h2 className="font-display text-xl font-semibold leading-tight text-text-primary sm:text-2xl">
            {L === "fr"
              ? "Un pronostic, du 1ᵉʳ match au sacre"
              : "One run, from kickoff to the trophy"}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-text-secondary">
            {L === "fr"
              ? "Suis un pronostic type et regarde les points s'empiler, tour après tour, jusqu'à la finale. Chiffres donnés à titre d'exemple."
              : "Follow a typical run and watch the points stack, round after round, all the way to the final. Numbers shown as an example."}
          </p>

          <div className="mt-5 space-y-3">
            <JourneyStage
              icon={Sparkles}
              accent="primary"
              title={L === "fr" ? "Phase de groupes" : "Group stage"}
              sub={
                L === "fr"
                  ? "tes scores, match par match"
                  : "your scores, match by match"
              }
              rows={
                L === "fr"
                  ? [
                      { label: "Argentine 2–1 → résultat 2–1", note: "vainqueur + total + score exact", pts: 13 },
                      { label: "Brésil 3–0 → résultat 3–1", note: "vainqueur + total à ±1", pts: 5 },
                      { label: "France 1–0 → résultat 1–0", note: "bon vainqueur", pts: 3 },
                    ]
                  : [
                      { label: "Argentina 2–1 → result 2–1", note: "winner + total + exact score", pts: 13 },
                      { label: "Brazil 3–0 → result 3–1", note: "winner + total within 1", pts: 5 },
                      { label: "France 1–0 → result 1–0", note: "correct winner", pts: 3 },
                    ]
              }
              subtotalLabel={L === "fr" ? "sur 3 matchs montrés" : "across 3 shown matches"}
              subtotal={21}
            />

            <JourneyStage
              icon={ListOrdered}
              accent="violet"
              title={L === "fr" ? "Ta phase finale" : "Your bracket"}
              sub={
                L === "fr"
                  ? "points par équipe envoyée au bon tour"
                  : "points per team you send to the right round"
              }
              rows={
                L === "fr"
                  ? [
                      { label: "8ᵉˢ de finale — 12 bonnes équipes", note: "+1 par équipe", pts: 12 },
                      { label: "Quarts — 6 bonnes équipes", note: "+3 par équipe", pts: 18 },
                      { label: "Demies — 3 bonnes équipes", note: "+6 par équipe", pts: 18 },
                      { label: "Finale — tes 2 finalistes y sont", note: "+10 par équipe", pts: 20 },
                    ]
                  : [
                      { label: "Round of 16 — 12 correct teams", note: "+1 per team", pts: 12 },
                      { label: "Quarters — 6 correct teams", note: "+3 per team", pts: 18 },
                      { label: "Semis — 3 correct teams", note: "+6 per team", pts: 18 },
                      { label: "Final — both your finalists made it", note: "+10 per team", pts: 20 },
                    ]
              }
              subtotalLabel={L === "fr" ? "parcours" : "run"}
              subtotal={68}
            />

            <JourneyStage
              icon={Crown}
              accent="gold"
              title={L === "fr" ? "Le podium" : "The podium"}
              sub={L === "fr" ? "le gros lot" : "the jackpot"}
              rows={
                L === "fr"
                  ? [
                      { label: "🏆 Champion exact — Argentine", note: "le sacre", pts: 30 },
                      { label: "🥈 Finaliste exact", note: "le 2ᵉ", pts: 20 },
                      { label: "🥉 3ᵉ place exacte", note: "le 3ᵉ", pts: 15 },
                    ]
                  : [
                      { label: "🏆 Exact champion — Argentina", note: "the title", pts: 30 },
                      { label: "🥈 Exact runner-up", note: "2nd place", pts: 20 },
                      { label: "🥉 Exact 3rd place", note: "3rd place", pts: 15 },
                    ]
              }
              subtotalLabel={L === "fr" ? "podium" : "podium"}
              subtotal={65}
            />
          </div>

          {/* Grand total */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-[10px] border border-gold-500/40 bg-gold-500/[0.12] px-4 py-3.5 shadow-glow-gold">
            <span className="flex items-center gap-2 font-display text-sm font-semibold text-gold-200">
              <Crown className="size-4 text-gold-300" strokeWidth={1.9} />
              {L === "fr" ? "Total de l'exemple" : "Example total"}
            </span>
            <span className="font-display text-2xl font-bold tabular-nums text-gold-200">
              154{" "}
              <span className="text-sm font-semibold text-gold-300/80">pts</span>
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-text-tertiary">
            {L === "fr"
              ? "21 (poules, extrait) + 68 (parcours) + 65 (podium). Ton total réel dépend de tous tes matchs et de ton arbre."
              : "21 (groups, excerpt) + 68 (run) + 65 (podium). Your real total depends on all your matches and your bracket."}
          </p>
        </div>
      </section>

      {/* Pot + payout */}
      <section className="mt-10 rounded-[14px] border border-gold-500/35 bg-gradient-to-br from-gold-500/[0.12] via-primary-500/[0.04] to-transparent p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-gold-500/40 bg-gold-500/15 text-gold-300 shadow-glow-gold">
            <Crown className="size-6" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-text-primary">
              {L === "fr"
                ? "Le pot du groupe récompense les meilleurs"
                : "The group pot rewards the best"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {L === "fr"
                ? `À la fin du tournoi (${tournamentEnd}), le pot commun (les accès, moins ${settings.prize_distribution.house_rake_pct}% de frais Stripe et d'hébergement) peut être réparti entre les membres les mieux classés — à l'amiable, à la discrétion de l'organisateur. À titre indicatif : ${settings.prize_distribution.description_fr || `${settings.prize_distribution.shares.join("% / ")}%`}.`
                : `When the tournament ends (${tournamentEnd}), the group pot (access fees, minus ${settings.prize_distribution.house_rake_pct}% Stripe and hosting costs) may be shared among the top-ranked members — informally, at the organizer's discretion. As a guide: ${settings.prize_distribution.description_en || `${settings.prize_distribution.shares.join("% / ")}%`}.`}
            </p>
            <Link
              href="/leaderboard/global"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-300 underline-offset-4 hover:underline"
            >
              {L === "fr" ? "Voir le classement live" : "View live leaderboard"}
              <ArrowRight className="size-3" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* Lock + safety */}
      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <NoteCard
          icon={CalendarClock}
          title={L === "fr" ? "Un seul verrou" : "One single lock"}
          body={
            L === "fr"
              ? `Tout — scores de poule ET arbre — reste modifiable jusqu'à 1 h avant le coup d'envoi du 1ᵉʳ match (${lockLabel}). Ensuite, plus aucune modification. Les payeurs qui n'ont rien rempli reçoivent un pronostic aléatoire.`
              : `Everything — group scores AND bracket — stays editable until 1 h before the first match (${lockLabel}). After that, no more changes. Paying members who left it empty get a random prediction.`
          }
        />
        <NoteCard
          icon={ShieldCheck}
          title={L === "fr" ? "Validation 100% auto" : "100% auto-validation"}
          body={
            L === "fr"
              ? "Aucun admin ne valide tes paris : dès que le résultat tombe, le scoring engine attribue les points et tu reçois une notif."
              : "No admin validates your bets: once results are in, the scoring engine awards points and pings you."
          }
        />
      </section>
      </div>
    </main>
  );
}

function Step({
  n,
  icon: Icon,
  accent,
  title,
  body,
  bullets,
  cta,
}: {
  n: number;
  icon: LucideIcon;
  accent: "gold" | "primary" | "violet";
  title: string;
  body: string;
  bullets?: string[];
  cta?: { href: string; label: string };
}) {
  const tone = {
    gold: "border-gold-500/30 bg-gold-500/[0.06] text-gold-300",
    primary: "border-primary-500/30 bg-primary-500/[0.06] text-primary-300",
    violet: "border-violet-500/30 bg-violet-500/[0.06] text-violet-300",
  }[accent];
  return (
    <li
      className={`relative rounded-md border bg-surface-1/[0.6] p-5 backdrop-blur-xl ${tone.split(" ").slice(0, 1).join(" ")}`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-[10px] border ${tone}`}
        >
          <Icon className="size-5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xs font-bold tabular-nums text-text-tertiary">
              {String(n).padStart(2, "0")}
            </span>
            <h2 className="font-display text-lg font-semibold text-text-primary sm:text-xl">
              {title}
            </h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{body}</p>
          {bullets && (
            <ul className="mt-3 space-y-1 text-xs leading-5 text-text-tertiary">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-text-tertiary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {cta && (
            <Link
              href={cta.href}
              className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:border-white/[0.2] hover:bg-white/[0.08]"
            >
              {cta.label}
              <ArrowRight className="size-3" strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

function ScoreCard({
  icon: Icon,
  title,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  sub: string;
  accent: "gold" | "primary" | "violet";
}) {
  const tone = {
    gold: "border-gold-500/30 text-gold-300",
    primary: "border-primary-500/30 text-primary-300",
    violet: "border-violet-500/30 text-violet-300",
  }[accent];
  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-8 items-center justify-center rounded-sm border ${tone}`}
          >
            <Icon className="size-4" strokeWidth={1.7} />
          </span>
          <span className="text-sm font-semibold text-text-primary">
            {title}
          </span>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-bold tabular-nums text-text-primary">
            {value}
          </div>
        </div>
      </div>
      <div className="mt-1 pl-10 text-[11px] text-text-tertiary">{sub}</div>
    </div>
  );
}

function NoteCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.5] p-4 backdrop-blur-xl">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon
          className="size-4 text-text-tertiary"
          strokeWidth={1.7}
        />
        <span className="text-sm font-semibold text-text-primary">{title}</span>
      </div>
      <p className="text-xs leading-5 text-text-secondary">{body}</p>
    </div>
  );
}

function JourneyStage({
  icon: Icon,
  accent,
  title,
  sub,
  rows,
  subtotalLabel,
  subtotal,
}: {
  icon: LucideIcon;
  accent: "gold" | "primary" | "violet";
  title: string;
  sub: string;
  rows: { label: string; note: string; pts: number }[];
  subtotalLabel: string;
  subtotal: number;
}) {
  const tone = {
    gold: "border-gold-500/30 bg-gold-500/[0.06] text-gold-300",
    primary: "border-primary-500/30 bg-primary-500/[0.06] text-primary-300",
    violet: "border-violet-500/30 bg-violet-500/[0.06] text-violet-300",
  }[accent];
  const ptsTone = {
    gold: "text-gold-300",
    primary: "text-primary-300",
    violet: "text-violet-300",
  }[accent];
  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] border ${tone}`}
        >
          <Icon className="size-5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold text-text-primary">
            {title}
          </div>
          <div className="text-[11px] text-text-tertiary">{sub}</div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-baseline justify-between gap-3 border-t border-white/[0.05] pt-1.5 first:border-0 first:pt-0"
          >
            <span className="min-w-0 text-xs leading-5 text-text-secondary">
              {r.label}
              <span className="ml-1.5 text-[10px] text-text-tertiary">
                · {r.note}
              </span>
            </span>
            <b className={`shrink-0 font-mono text-sm tabular-nums ${ptsTone}`}>
              +{r.pts}
            </b>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-white/[0.1] pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {subtotalLabel}
        </span>
        <b className={`font-display text-base font-bold tabular-nums ${ptsTone}`}>
          +{subtotal}
        </b>
      </div>
    </div>
  );
}
