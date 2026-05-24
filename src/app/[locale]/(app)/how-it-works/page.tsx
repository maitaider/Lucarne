import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
  Users,
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
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <header className="relative mb-8 overflow-hidden rounded-[12px] border border-white/[0.13] bg-abyss/[0.8] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-8">
        <Image
          src="/marketing/lucarne-hero-stadium.jpg"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-[60%_44%] opacity-[0.18]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(96deg,rgba(5,6,5,0.94)_0%,rgba(5,6,5,0.78)_44%,rgba(5,6,5,0.5)_100%)]" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-primary-500/35 bg-primary-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-300">
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
              ? `Un seul paiement, deux niveaux de pronostic, top 3 du classement final partage la cagnotte. Tournoi du ${tournamentStart} au ${tournamentEnd}.`
              : `One payment, two levels of prediction, top 3 split the pot. Tournament runs ${tournamentStart} to ${tournamentEnd}.`}
          </p>
        </div>
      </header>

      <ol className="space-y-4">
        <Step
          n={1}
          icon={Ticket}
          accent="gold"
          title={L === "fr" ? "Achète ta place" : "Buy your seat"}
          body={
            L === "fr"
              ? `Une seule fois. ${buyInLabel} via Stripe, débloque l'accès complet aux pronos sur les 104 matchs. Fenêtre d'achat ouverte jusqu'au ${lockLabel}. Pas d'abonnement, pas de relance.`
              : `One-time. ${buyInLabel} via Stripe, unlocks full picking access on all 104 matches. Sales open until ${lockLabel}. No subscription, no upsell.`
          }
          cta={{
            href: "/buy-in",
            label: L === "fr" ? "Acheter ma place" : "Buy my seat",
          }}
        />

        <Step
          n={2}
          icon={Trophy}
          accent="gold"
          title={L === "fr" ? "Bâtis ton scénario (Bracket)" : "Build your scenario (Bracket)"}
          body={
            L === "fr"
              ? "Étape stratégique, une seule fois. Classe les 12 groupes de la 1ʳᵉ à la 4ᵉ place, fais avancer tes équipes de tour en tour jusqu'à ton champion. Modifiable jusqu'au coup d'envoi du 1ᵉʳ match — après, plus de modif."
              : "Strategic step, one-shot. Rank the 12 groups 1st to 4th, drive your teams through every knockout round to your champion. Editable until the first kickoff — locked after that."
          }
          cta={{
            href: "/bracket",
            label: L === "fr" ? "Ouvrir le bracket" : "Open the bracket",
          }}
          bullets={
            L === "fr"
              ? [
                  "1ᵉʳ et 2ᵉ de chaque groupe se qualifient automatiquement",
                  "Les 8 meilleurs 3ᵉ aussi (tu choisis lequel remplit chaque slot R32)",
                  "Cascade auto : si tu changes ton vainqueur R32, R16/QF/SF se ré-évaluent",
                ]
              : [
                  "Group 1st + 2nd qualify automatically",
                  "Best 8 third-placed too (you pick which fills each R32 slot)",
                  "Auto-cascade: change a R32 winner and R16/QF/SF re-resolve",
                ]
          }
        />

        <Step
          n={3}
          icon={Sparkles}
          accent="primary"
          title={L === "fr" ? "Affine match par match (Pronos)" : "Refine match by match (Picks)"}
          body={
            L === "fr"
              ? "Étape tactique, en continu pendant le tournoi. Sur chaque match : vainqueur 1/N/2, total de buts, jusqu'à 4 buteurs. Modifiable jusqu'à 1 h avant chaque coup d'envoi. Tap = sauvegardé."
              : "Tactical step, ongoing through the tournament. For each match: winner 1/N/2, total goals, up to 4 scorers. Editable up to 1 h before each kickoff. Tap = saved."
          }
          cta={{
            href: "/picks",
            label: L === "fr" ? "Ouvrir les pronos" : "Open picks",
          }}
        />

        <Step
          n={4}
          icon={Target}
          accent="violet"
          title={L === "fr" ? "Les points tombent automatiquement" : "Points settle automatically"}
          body={
            L === "fr"
              ? "Dès qu'un match finit, le moteur de scoring lit les buts et clôture tes paris. Pas d'admin à attendre. Voir les barèmes ci-dessous."
              : "As soon as a match ends, the scoring engine reads the goals and settles your bets. No admin wait. Scoring breakdown below."
          }
        />
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
            icon={Users}
            title={L === "fr" ? "Buteur (anytime)" : "Anytime scorer"}
            value="+4"
            sub={L === "fr" ? "par joueur trouvé" : "per correct scorer"}
            accent="violet"
          />
          <ScoreCard
            icon={Zap}
            title={L === "fr" ? "Premier buteur" : "First scorer"}
            value="+8"
            sub={L === "fr" ? "si bon en premier" : "if right at minute one"}
            accent="primary"
          />
        </div>

        <p className="mt-4 rounded-[10px] border border-white/[0.08] bg-surface-1/[0.5] p-4 text-xs leading-5 text-text-secondary backdrop-blur-xl">
          {L === "fr"
            ? "Le bracket complet vaut aussi des points (groupes correctement classés, vainqueurs de tour, finalistes, champion) — barème détaillé bientôt sur cette page. Les pronos par match sont indépendants du bracket : tu cumules les deux."
            : "The full bracket also scores points (correctly ranked groups, round winners, finalists, champion) — full table coming soon. Per-match picks stack independently of the bracket."}
        </p>
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
                ? "Le top 3 se partage la cagnotte"
                : "Top 3 split the pot"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {L === "fr"
                ? `À la fin du tournoi (${tournamentEnd}), le total des places vendues — moins la commission maison (${settings.prize_distribution.house_rake_pct}%) — est partagé selon ${settings.prize_distribution.description_fr || `${settings.prize_distribution.shares.join("% / ")}%`}.`
                : `When the tournament ends (${tournamentEnd}), every paid seat — minus the house cut (${settings.prize_distribution.house_rake_pct}%) — is split per ${settings.prize_distribution.description_en || `${settings.prize_distribution.shares.join("% / ")}%`}.`}
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
          title={L === "fr" ? "Deux types de verrou" : "Two kinds of lock"}
          body={
            L === "fr"
              ? `Bracket : verrouillé une seule fois le ${lockLabel}. Pronos par match : chaque ligne se verrouille 1 h avant son propre coup d'envoi.`
              : `Bracket: locked once on ${lockLabel}. Per-match picks: each row locks 1 h before its own kickoff.`
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
      className={`relative rounded-[12px] border bg-surface-1/[0.6] p-5 backdrop-blur-xl ${tone.split(" ").slice(0, 1).join(" ")}`}
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
              className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:border-white/[0.2] hover:bg-white/[0.08]"
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
            className={`flex size-8 items-center justify-center rounded-[8px] border ${tone}`}
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
