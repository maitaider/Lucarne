import { setRequestLocale } from "next-intl/server";
import { listMyBets } from "@/lib/bets/queries";
import { BetsTabsPanel } from "@/components/bet/bets-tabs-panel";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export default async function MyBetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const bets = await listMyBets();

  const groups = {
    validated: bets.filter((b) => b.status === "validated"),
    settled: bets.filter((b) => b.status === "settled"),
    other: bets.filter((b) =>
      ["rejected", "refunded"].includes(b.status),
    ),
  };
  const totalPoints = groups.settled.reduce(
    (sum, bet) => sum + (bet.points ?? 0),
    0,
  );
  const settledWins = groups.settled.filter((bet) => bet.result === "won").length;

  return (
    <AppPageShell width="ultra">
      <PageHero
        kicker={L === "fr" ? "Suivi Mondial 2026" : "World Cup 2026 tracker"}
        kickerIcon={ListChecks}
        accent="gold"
        title={L === "fr" ? "Mes pronostics" : "My predictions"}
        description={
          L === "fr"
            ? `${bets.length} pronostic${bets.length > 1 ? "s" : ""} placé${bets.length > 1 ? "s" : ""}. Suis tes prédictions, les points en jeu et les résultats — c'est gratuit, tout se joue aux points.`
            : `${bets.length} prediction${bets.length > 1 ? "s" : ""} placed. Track your picks, the points at stake, and the outcomes — it's free, everything is scored in points.`
        }
        actions={
          <Link
            href="/predict"
            className="inline-flex items-center justify-center gap-1.5 rounded-sm bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
          >
            <ArrowRight className="size-4" strokeWidth={2} />
            {L === "fr" ? "Faire un prono" : "Make a pick"}
          </Link>
        }
      />

      <PredictionConsole
        locale={L}
        validated={groups.validated.length}
        settled={groups.settled.length}
        totalPoints={totalPoints}
        settledWins={settledWins}
      />

      {bets.length === 0 ? (
        <EmptyBets locale={L} />
      ) : (
        <BetsTabsPanel bets={bets} locale={L} />
      )}
    </AppPageShell>
  );
}

function PredictionConsole({
  locale,
  validated,
  settled,
  totalPoints,
  settledWins,
}: {
  locale: Locale;
  validated: number;
  settled: number;
  totalPoints: number;
  settledWins: number;
}) {
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-3">
      <BetMetric
        icon={ShieldCheck}
        label={locale === "fr" ? "En attente" : "Pending"}
        value={validated}
        detail={locale === "fr" ? "matchs à venir" : "upcoming matches"}
        accent="primary"
      />
      <BetMetric
        icon={Sparkles}
        label={locale === "fr" ? "Résolus" : "Settled"}
        value={settled}
        detail={`${settledWins} ${locale === "fr" ? "réussis" : "correct"}`}
        accent="violet"
      />
      <BetMetric
        icon={Trophy}
        label={locale === "fr" ? "Points cumulés" : "Total points"}
        value={totalPoints}
        detail={locale === "fr" ? "depuis le début" : "so far"}
        accent="gold"
      />
    </section>
  );
}

function BetMetric({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  accent: "primary" | "gold" | "violet";
}) {
  const color = {
    primary: "border-primary-500/25 bg-primary-500/[0.09] text-primary-400",
    gold: "border-gold-500/30 bg-gold-500/[0.09] text-gold-400",
    violet: "border-violet-500/25 bg-violet-500/[0.09] text-violet-400",
  }[accent];

  return (
    <div className="rounded-sm border border-white/[0.08] bg-surface-1/[0.64] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={`rounded-sm border p-1.5 ${color}`}>
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
      <div className="mt-1 text-xs text-text-tertiary">{detail}</div>
    </div>
  );
}

function EmptyBets({ locale }: { locale: Locale }) {
  const steps = [
    {
      title: locale === "fr" ? "Choisir un match" : "Choose a match",
      text:
        locale === "fr"
          ? "Ouvre le calendrier et sélectionne une affiche de groupe ou de phase finale."
          : "Open the calendar and select a group or knockout fixture.",
    },
    {
      title: locale === "fr" ? "Faire ton prono" : "Make your pick",
      text:
        locale === "fr"
          ? "Vainqueur, score exact, buteurs… plus c'est précis, plus ça rapporte de points."
          : "Winner, exact score, scorers… the sharper your call, the more points it earns.",
    },
    {
      title: locale === "fr" ? "Suivre tes points" : "Track your points",
      text:
        locale === "fr"
          ? "Tes points apparaissent ici dès qu'un match est terminé, et grimpent au classement."
          : "Your points show up here as soon as a match ends, and climb the leaderboard.",
    },
  ];

  return (
    <div className="rounded-sm border border-dashed border-white/[0.14] bg-surface-1/[0.62] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-sm bg-gold-500/15 p-2.5 text-gold-400 ring-1 ring-gold-500/30">
          <Target className="size-5" strokeWidth={1.6} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {locale === "fr" ? "Aucun pronostic pour le moment" : "No predictions yet"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {locale === "fr"
              ? "Tout est prêt : tes pronostics, les points en jeu et les résultats s'afficheront ici dès ta première prédiction."
              : "All set: your predictions, the points at stake, and the outcomes will appear here after your first pick."}
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step, idx) => (
          <div key={step.title} className="rounded-sm border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="mb-3 flex size-7 items-center justify-center rounded-sm bg-primary-500/[0.1] font-display text-sm font-bold text-primary-400 ring-1 ring-primary-500/25">
              {idx + 1}
            </div>
            <h3 className="text-sm font-semibold text-text-primary">{step.title}</h3>
            <p className="mt-1 text-xs leading-5 text-text-secondary">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
