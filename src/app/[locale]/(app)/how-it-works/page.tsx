import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/reveal";
import { Flag } from "@/components/team/flag";
import {
  getAppSettings,
  formatMoney,
  effectiveBuyInDeadline,
} from "@/lib/admin/economy";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
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
  const fr = L === "fr";

  const settings = await getAppSettings();
  const moneyLocale = fr ? "fr-CA" : "en-CA";
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
  ).toLocaleDateString(moneyLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="relative">
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <header className="relative mb-10 flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[18px] border border-white/[0.14] shadow-[0_34px_110px_rgba(0,0,0,0.5)] sm:min-h-[340px]">
          <Image
            src="/assets/lucarne/world-cup-2026/03-usa-final-strike.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-20 object-cover object-[68%_30%]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgba(5,6,5,0.95)_0%,rgba(5,6,5,0.8)_42%,rgba(5,6,5,0.32)_72%,rgba(5,6,5,0.12)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(5,6,5,0.85)_0%,transparent_55%)]" />

          <div className="relative max-w-2xl p-6 sm:p-8">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary-500/40 bg-primary-500/[0.14] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-200 backdrop-blur-sm">
              <HelpCircle className="size-3.5" strokeWidth={1.9} />
              {fr ? "Le guide" : "The guide"}
            </div>
            <h1 className="font-display text-[2.1rem] font-bold leading-[1.05] text-white drop-shadow-lg sm:text-5xl">
              {fr ? "Comment marche Lucarne" : "How Lucarne works"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
              {fr
                ? `Un paiement pour l'accès, deux niveaux de pronostic, un pot commun qui récompense les meilleurs. Du ${tournamentStart} au ${tournamentEnd}.`
                : `One payment for access, two levels of prediction, a group pot that rewards the best. From ${tournamentStart} to ${tournamentEnd}.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { v: "104", l: fr ? "matchs" : "matches" },
                { v: "48", l: fr ? "équipes" : "teams" },
                { v: "13", l: fr ? "pts max / match" : "pts max / match" },
                { v: "0", l: fr ? "calcul à la main" : "manual math" },
              ].map((s) => (
                <span
                  key={s.l}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-white/[0.16] bg-white/[0.08] px-2.5 py-1 text-xs text-white/90 backdrop-blur-sm"
                >
                  <b className="font-display tabular-nums text-white">{s.v}</b>
                  <span className="text-white/65">{s.l}</span>
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* ── STEPS (vertical timeline) ────────────────────────────────── */}
        <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-semibold text-text-primary">
          <Sparkles className="size-5 text-primary-400" strokeWidth={1.9} />
          {fr ? "En 4 étapes" : "In 4 steps"}
        </h2>
        <ol className="space-y-0">
          <Reveal>
            <TimelineStep
              n={1}
              icon={Ticket}
              accent="gold"
              title={fr ? "Achète ta place" : "Buy your seat"}
              body={
                fr
                  ? `Une seule fois. ${buyInLabel} via Stripe, et tu débloques tous les pronos sur les 104 matchs. Pas d'abonnement. Vente ouverte jusqu'au ${lockLabel}.`
                  : `One-time. ${buyInLabel} via Stripe unlocks every pick across the 104 matches. No subscription. Sales open until ${lockLabel}.`
              }
              cta={{
                href: "/buy-in",
                label: fr ? "Acheter ma place" : "Buy my seat",
              }}
            />
          </Reveal>
          <Reveal delayMs={90}>
            <TimelineStep
              n={2}
              icon={MousePointerClick}
              accent="primary"
              title={fr ? "Pronostique les groupes" : "Predict the groups"}
              body={
                fr
                  ? "Entre le score de chaque match (ex. 2-1). Le classement de chaque groupe se calcule tout seul à partir de tes résultats."
                  : "Enter each match score (e.g. 2-1). Every group's standings compute themselves from your results."
              }
              cta={{
                href: "/predict?tab=groupes",
                label: fr ? "Pronostiquer les groupes" : "Predict groups",
              }}
              bullets={
                fr
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
            <TimelineStep
              n={3}
              icon={Trophy}
              accent="violet"
              title={fr ? "Bâtis ta phase finale" : "Build your bracket"}
              body={
                fr
                  ? "L'arbre se remplit depuis tes groupes. Tape l'équipe qui passe à chaque tour, jusqu'à ton champion. C'est noté : des points par bonne équipe + un gros lot pour le podium."
                  : "The bracket fills from your groups. Tap the team that advances each round, up to your champion. It's scored: points per correct team + a big bonus for the podium."
              }
              cta={{
                href: "/predict?tab=finale",
                label: fr ? "Ouvrir la phase finale" : "Open knockouts",
              }}
            />
          </Reveal>
          <Reveal delayMs={270}>
            <TimelineStep
              n={4}
              icon={Target}
              accent="gold"
              title={fr ? "Les points tombent seuls" : "Points land on their own"}
              body={
                fr
                  ? "Dès qu'un match est terminé, le moteur lit le score et clôture tes pronos — aucun admin à attendre. Tout est verrouillé une seule fois, 1 h avant le 1ᵉʳ match."
                  : "As soon as a match ends, the engine reads the score and settles your picks — no admin wait. Everything locks once, 1 h before the first match."
              }
              last
            />
          </Reveal>
        </ol>

        {/* ── BARÈME ───────────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-text-primary">
            <ListOrdered className="size-5 text-primary-400" strokeWidth={1.9} />
            {fr ? "Le barème" : "The scoring"}
          </h2>

          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-text-tertiary">
            {fr ? "Phase de groupes — par match" : "Group stage — per match"}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ScoreCard
              icon={MousePointerClick}
              title={fr ? "Bon vainqueur" : "Right winner"}
              value="+3"
              accent="primary"
            />
            <ScoreCard
              icon={Target}
              title={fr ? "Total de buts" : "Total goals"}
              value="+5"
              sub={fr ? "exact · +2 à ±1" : "exact · +2 within 1"}
              accent="gold"
            />
            <ScoreCard
              icon={Zap}
              title={fr ? "Score exact" : "Exact score"}
              value="+5"
              accent="violet"
            />
          </div>
          <div className="mt-3 rounded-[10px] border border-primary-500/25 bg-primary-500/[0.07] p-4 text-xs leading-6 text-text-secondary backdrop-blur-xl">
            <span className="font-semibold text-text-primary">
              {fr ? "Ça se cumule. " : "It stacks. "}
            </span>
            {fr
              ? "Un seul pronostic de score peut rapporter le vainqueur + le total + le score exact en même temps — jusqu'à +13 sur un match."
              : "A single score pick can earn winner + total + exact score at once — up to +13 on one match."}
          </div>

          <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-text-tertiary">
            {fr ? "Phase finale — par équipe bien placée" : "Knockouts — per correctly placed team"}
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <RoundChip label={fr ? "8ᵉˢ" : "R16"} value="+1" />
            <RoundChip label={fr ? "Quarts" : "QF"} value="+3" />
            <RoundChip label={fr ? "Demies" : "SF"} value="+6" />
            <RoundChip label={fr ? "Finale" : "Final"} value="+10" />
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            <PodiumChip medal="🥇" label={fr ? "Champion" : "Champion"} value="+30" />
            <PodiumChip medal="🥈" label={fr ? "Finaliste" : "Runner-up"} value="+20" />
            <PodiumChip medal="🥉" label={fr ? "3ᵉ place" : "3rd place"} value="+15" />
          </div>
        </section>

        {/* ── WORKED EXAMPLE — the scorecard ledger ────────────────────── */}
        <section className="relative mt-12 overflow-hidden rounded-[18px] border border-gold-500/30 shadow-[0_34px_110px_rgba(0,0,0,0.5)]">
          <Image
            src="/assets/lucarne/world-cup-2026/04-argentina-net-shot.png"
            alt=""
            fill
            sizes="100vw"
            className="absolute inset-0 -z-20 object-cover object-[75%_25%] opacity-[0.28]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(125deg,rgba(5,6,5,0.96)_0%,rgba(5,6,5,0.88)_45%,rgba(5,6,5,0.62)_100%)]" />

          <div className="relative p-5 sm:p-7">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/[0.14] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-200">
              <Trophy className="size-3.5" strokeWidth={1.9} />
              {fr ? "Exemple complet" : "Full example"}
            </div>
            <h2 className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">
              {fr
                ? "Un parcours, du 1ᵉʳ match au titre"
                : "One run, from kickoff to the title"}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/80">
              {fr
                ? "Comment les points s'additionnent, étape par étape. Chiffres donnés à titre d'exemple."
                : "How the points add up, step by step. Numbers shown as an example."}
            </p>

            {/* The ledger */}
            <div className="mt-5 overflow-hidden rounded-[12px] border border-white/[0.1] bg-surface-1/[0.55] backdrop-blur-xl">
              {/* Group stage */}
              <LedgerSection
                title={fr ? "Phase de groupes" : "Group stage"}
                hint={fr ? "tes scores" : "your scores"}
                accent="primary"
                subtotal={21}
                subtotalLabel={fr ? "3 matchs montrés" : "3 shown matches"}
              >
                <LedgerRow
                  lead={<Flag isoCode="ar" size="sm" rounded />}
                  main="Argentine · 2-1 → 2-1"
                  sub={fr ? "vainqueur + total + score exact" : "winner + total + exact score"}
                  pts={13}
                  accent="primary"
                />
                <LedgerRow
                  lead={<Flag isoCode="br" size="sm" rounded />}
                  main="Brésil · 3-0 → 3-1"
                  sub={fr ? "bon vainqueur + total à ±1" : "right winner + total within 1"}
                  pts={5}
                  accent="primary"
                />
                <LedgerRow
                  lead={<Flag isoCode="fr" size="sm" rounded />}
                  main="France · 1-0 → 2-1"
                  sub={fr ? "bon vainqueur seulement" : "right winner only"}
                  pts={3}
                  accent="primary"
                />
              </LedgerSection>

              {/* Knockouts */}
              <LedgerSection
                title={fr ? "Ta phase finale" : "Your bracket"}
                hint={fr ? "par équipe bien placée" : "per correct team"}
                accent="violet"
                subtotal={68}
                subtotalLabel={fr ? "parcours" : "run"}
              >
                <LedgerRow
                  lead={<RoundBadge>{fr ? "8ᵉˢ" : "R16"}</RoundBadge>}
                  main={fr ? "12 bonnes équipes" : "12 correct teams"}
                  sub="12 × +1"
                  pts={12}
                  accent="violet"
                />
                <LedgerRow
                  lead={<RoundBadge>{fr ? "Quarts" : "QF"}</RoundBadge>}
                  main={fr ? "6 bonnes équipes" : "6 correct teams"}
                  sub="6 × +3"
                  pts={18}
                  accent="violet"
                />
                <LedgerRow
                  lead={<RoundBadge>{fr ? "Demies" : "SF"}</RoundBadge>}
                  main={fr ? "3 bonnes équipes" : "3 correct teams"}
                  sub="3 × +6"
                  pts={18}
                  accent="violet"
                />
                <LedgerRow
                  lead={<RoundBadge>{fr ? "Finale" : "Final"}</RoundBadge>}
                  main={fr ? "tes 2 finalistes y sont" : "both your finalists made it"}
                  sub="2 × +10"
                  pts={20}
                  accent="violet"
                />
              </LedgerSection>

              {/* Podium */}
              <LedgerSection
                title={fr ? "Le podium" : "The podium"}
                hint={fr ? "le gros lot" : "the jackpot"}
                accent="gold"
                subtotal={65}
                subtotalLabel="podium"
              >
                <LedgerRow
                  lead={<span className="text-lg leading-none">🥇</span>}
                  main={fr ? "Champion exact · Argentine" : "Exact champion · Argentina"}
                  pts={30}
                  accent="gold"
                />
                <LedgerRow
                  lead={<span className="text-lg leading-none">🥈</span>}
                  main={fr ? "Finaliste exact" : "Exact runner-up"}
                  pts={20}
                  accent="gold"
                />
                <LedgerRow
                  lead={<span className="text-lg leading-none">🥉</span>}
                  main={fr ? "3ᵉ place exacte" : "Exact 3rd place"}
                  pts={15}
                  accent="gold"
                />
              </LedgerSection>
            </div>

            {/* Grand total */}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] border border-gold-500/45 bg-gold-500/[0.14] px-5 py-4 shadow-glow-gold">
              <span className="flex items-center gap-2.5 font-display text-base font-semibold text-gold-100">
                <Crown className="size-5 text-gold-300" strokeWidth={1.9} />
                {fr ? "Total de l'exemple" : "Example total"}
              </span>
              <span className="font-display text-3xl font-bold tabular-nums text-gold-100">
                154
                <span className="ml-1 text-base font-semibold text-gold-300/80">
                  pts
                </span>
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-white/55">
              {fr
                ? "21 (poules, extrait) + 68 (parcours) + 65 (podium). Ton total réel dépend de tous tes matchs et de ton arbre."
                : "21 (groups, excerpt) + 68 (run) + 65 (podium). Your real total depends on all your matches and your bracket."}
            </p>
          </div>
        </section>

        {/* ── POT ──────────────────────────────────────────────────────── */}
        <section className="relative mt-12 overflow-hidden rounded-[14px] border border-gold-500/35 bg-gradient-to-br from-gold-500/[0.12] via-primary-500/[0.04] to-transparent p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-gold-500/40 bg-gold-500/15 text-gold-300 shadow-glow-gold">
              <Crown className="size-6" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-text-primary">
                {fr
                  ? "Le pot du groupe récompense les meilleurs"
                  : "The group pot rewards the best"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {fr
                  ? `À la fin du tournoi (${tournamentEnd}), le pot commun (les accès, moins ${settings.prize_distribution.house_rake_pct}% de frais Stripe et d'hébergement) peut être réparti entre les mieux classés — à l'amiable, à la discrétion de l'organisateur. À titre indicatif : ${settings.prize_distribution.description_fr || `${settings.prize_distribution.shares.join("% / ")}%`}.`
                  : `When the tournament ends (${tournamentEnd}), the group pot (access fees, minus ${settings.prize_distribution.house_rake_pct}% Stripe and hosting costs) may be shared among the top-ranked members — informally, at the organizer's discretion. As a guide: ${settings.prize_distribution.description_en || `${settings.prize_distribution.shares.join("% / ")}%`}.`}
              </p>
              <Link
                href="/leaderboard/global"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-300 underline-offset-4 hover:underline"
              >
                {fr ? "Voir le classement live" : "View live leaderboard"}
                <ArrowRight className="size-3" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── LOCK + SAFETY ────────────────────────────────────────────── */}
        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          <NoteCard
            icon={CalendarClock}
            title={fr ? "Un seul verrou" : "One single lock"}
            body={
              fr
                ? `Tout — scores de poule ET arbre — reste modifiable jusqu'à 1 h avant le coup d'envoi du 1ᵉʳ match (${lockLabel}). Ensuite, plus aucune modification. Les payeurs qui n'ont rien rempli reçoivent un pronostic aléatoire.`
                : `Everything — group scores AND bracket — stays editable until 1 h before the first match (${lockLabel}). After that, no more changes. Paying members who left it empty get a random prediction.`
            }
          />
          <NoteCard
            icon={ShieldCheck}
            title={fr ? "Validation 100% auto" : "100% auto-validation"}
            body={
              fr
                ? "Aucun admin ne valide tes paris : dès que le résultat tombe, le moteur attribue les points et tu reçois une notif."
                : "No admin validates your bets: once results are in, the engine awards points and pings you."
            }
          />
        </section>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

const TONE: Record<
  "gold" | "primary" | "violet",
  { ring: string; chip: string; text: string }
> = {
  gold: {
    ring: "border-gold-500/40 bg-gold-500/[0.12]",
    chip: "border-gold-500/30 bg-gold-500/[0.07]",
    text: "text-gold-300",
  },
  primary: {
    ring: "border-primary-500/40 bg-primary-500/[0.12]",
    chip: "border-primary-500/30 bg-primary-500/[0.07]",
    text: "text-primary-300",
  },
  violet: {
    ring: "border-violet-500/40 bg-violet-500/[0.12]",
    chip: "border-violet-500/30 bg-violet-500/[0.07]",
    text: "text-violet-300",
  },
};

function TimelineStep({
  n,
  icon: Icon,
  accent,
  title,
  body,
  bullets,
  cta,
  last,
}: {
  n: number;
  icon: LucideIcon;
  accent: "gold" | "primary" | "violet";
  title: string;
  body: string;
  bullets?: string[];
  cta?: { href: string; label: string };
  last?: boolean;
}) {
  const tone = TONE[accent];
  return (
    <li className="relative flex gap-4">
      {/* Rail: numbered node + connector */}
      <div className="flex flex-col items-center">
        <span
          className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border font-display text-base font-bold tabular-nums ${tone.ring} ${tone.text} shadow-[0_4px_18px_rgba(0,0,0,0.4)]`}
        >
          {n}
        </span>
        {!last && (
          <span className="mt-1 w-px flex-1 bg-gradient-to-b from-white/[0.18] to-white/[0.04]" />
        )}
      </div>

      {/* Content card */}
      <div className="mb-4 min-w-0 flex-1 rounded-md border border-white/[0.09] bg-surface-1/[0.62] p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Icon className={`size-4 ${tone.text}`} strokeWidth={1.9} />
          <h3 className="font-display text-lg font-semibold text-text-primary">
            {title}
          </h3>
        </div>
        <p className="mt-1.5 text-sm leading-6 text-text-secondary">{body}</p>
        {bullets && (
          <ul className="mt-3 space-y-1.5">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-xs leading-5 text-text-tertiary"
              >
                <CheckCircle2
                  className={`mt-0.5 size-3.5 shrink-0 ${tone.text}`}
                  strokeWidth={2}
                />
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
  sub?: string;
  accent: "gold" | "primary" | "violet";
}) {
  const tone = TONE[accent];
  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`flex size-8 items-center justify-center rounded-sm border ${tone.chip} ${tone.text}`}
        >
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
        <span
          className={`font-display text-2xl font-bold tabular-nums ${tone.text}`}
        >
          {value}
        </span>
      </div>
      <div className="mt-2 text-sm font-semibold text-text-primary">{title}</div>
      {sub && <div className="text-[11px] text-text-tertiary">{sub}</div>}
    </div>
  );
}

function RoundChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[10px] border border-violet-500/25 bg-violet-500/[0.07] px-3 py-2.5 backdrop-blur-xl">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      <span className="font-display text-base font-bold tabular-nums text-violet-300">
        {value}
      </span>
    </div>
  );
}

function PodiumChip({
  medal,
  label,
  value,
}: {
  medal: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-[10px] border border-gold-500/30 bg-gold-500/[0.08] px-2 py-2.5 text-center backdrop-blur-xl">
      <span className="text-lg leading-none">{medal}</span>
      <span className="text-[11px] font-semibold text-text-secondary">
        {label}
      </span>
      <span className="font-display text-base font-bold tabular-nums text-gold-300">
        {value}
      </span>
    </div>
  );
}

function RoundBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 min-w-[2.4rem] items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/[0.12] px-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-200">
      {children}
    </span>
  );
}

function LedgerSection({
  title,
  hint,
  accent,
  subtotal,
  subtotalLabel,
  children,
}: {
  title: string;
  hint: string;
  accent: "gold" | "primary" | "violet";
  subtotal: number;
  subtotalLabel: string;
  children: React.ReactNode;
}) {
  const tone = TONE[accent];
  return (
    <div className="border-b border-white/[0.08] last:border-0">
      <div className="flex items-center justify-between gap-2 bg-white/[0.03] px-4 py-2">
        <div className="flex items-baseline gap-2">
          <span className={`size-1.5 rounded-full ${tone.text} bg-current`} />
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            {title}
          </span>
          <span className="text-[10px] text-text-tertiary">· {hint}</span>
        </div>
        <span className={`font-display text-sm font-bold tabular-nums ${tone.text}`}>
          +{subtotal}
          <span className="ml-1 text-[9px] font-medium uppercase text-text-tertiary">
            {subtotalLabel}
          </span>
        </span>
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function LedgerRow({
  lead,
  main,
  sub,
  pts,
  accent,
}: {
  lead: React.ReactNode;
  main: string;
  sub?: string;
  pts: number;
  accent: "gold" | "primary" | "violet";
}) {
  const tone = TONE[accent];
  return (
    <li className="flex items-center gap-3 border-t border-white/[0.05] px-4 py-2.5 first:border-0">
      <span className="flex w-7 shrink-0 justify-center">{lead}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text-primary">
          {main}
        </span>
        {sub && (
          <span className="block truncate text-[11px] text-text-tertiary">
            {sub}
          </span>
        )}
      </span>
      <span className={`shrink-0 font-mono text-sm font-bold tabular-nums ${tone.text}`}>
        +{pts}
      </span>
    </li>
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
        <Icon className="size-4 text-text-tertiary" strokeWidth={1.7} />
        <span className="text-sm font-semibold text-text-primary">{title}</span>
      </div>
      <p className="text-xs leading-5 text-text-secondary">{body}</p>
    </div>
  );
}
