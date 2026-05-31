import { setRequestLocale } from "next-intl/server";
import { listMyBets } from "@/lib/bets/queries";
import { BetsTabsPanel } from "@/components/bet/bets-tabs-panel";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Coins,
  Receipt,
  ShieldCheck,
  Sparkles,
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
  const activeStake = groups.validated.reduce(
    (sum, bet) => sum + Math.floor(bet.stake_cents / 100),
    0,
  );
  const settledWins = groups.settled.filter((bet) => bet.result === "won").length;

  return (
    <AppPageShell width="ultra">
      <PageHero
        kicker={
          L === "fr" ? "Mes tickets Mondial" : "My World Cup tickets"
        }
        kickerIcon={Receipt}
        accent="gold"
        title={L === "fr" ? "Salle des paris" : "Bet room"}
        description={
          L === "fr"
            ? `${bets.length} ticket${bets.length > 1 ? "s" : ""} placé${bets.length > 1 ? "s" : ""}. Suis la validation, les points en jeu et les résultats sans perdre le fil du tournoi.`
            : `${bets.length} ticket${bets.length > 1 ? "s" : ""} placed. Track validation, points at stake, and outcomes without losing the tournament thread.`
        }
        actions={
          <Link
            href="/predict"
            className="inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
          >
            <ArrowRight className="size-4" strokeWidth={2} />
            {L === "fr" ? "Ouvrir Pronostique" : "Open Predict"}
          </Link>
        }
      />

      <BetStatusConsole
        locale={L}
        validated={groups.validated.length}
        settled={groups.settled.length}
        other={groups.other.length}
        activeStake={activeStake}
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

function BetStatusConsole({
  locale,
  validated,
  settled,
  other,
  activeStake,
  settledWins,
}: {
  locale: Locale;
  validated: number;
  settled: number;
  other: number;
  activeStake: number;
  settledWins: number;
}) {
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-3">
      <BetMetric
        icon={ShieldCheck}
        label={locale === "fr" ? "Actifs" : "Active"}
        value={validated}
        detail={locale === "fr" ? "en jeu" : "in play"}
        accent="primary"
      />
      <BetMetric
        icon={Trophy}
        label={locale === "fr" ? "Résolus" : "Settled"}
        value={settled}
        detail={`${settledWins} ${locale === "fr" ? "gagnés" : "won"}`}
        accent="gold"
      />
      <BetMetric
        icon={Sparkles}
        label={locale === "fr" ? "À traiter" : "To handle"}
        value={other}
        detail={locale === "fr" ? "refus/remboursements" : "rejects/refunds"}
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
    <div className="rounded-[8px] border border-white/[0.08] bg-surface-1/[0.64] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={`rounded-[8px] border p-1.5 ${color}`}>
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
      title: locale === "fr" ? "Définir la mise" : "Set the stake",
      text:
        locale === "fr"
          ? "Utilise tes jetons pour construire une stratégie progressive."
          : "Use your tokens to build a progressive strategy.",
    },
    {
      title: locale === "fr" ? "Suivre la validation" : "Track validation",
      text:
        locale === "fr"
          ? "Le statut du ticket apparaît ici dès qu’il passe en revue."
          : "Ticket status appears here as soon as it enters review.",
    },
  ];

  return (
    <div className="rounded-[8px] border border-dashed border-white/[0.14] bg-surface-1/[0.62] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-[8px] bg-gold-500/15 p-2.5 text-gold-400 ring-1 ring-gold-500/30">
          <Trophy className="size-5" strokeWidth={1.6} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {locale === "fr" ? "Aucun pari pour le moment" : "No bets yet"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {locale === "fr"
              ? "La salle est prête: elle affichera tes tickets, les mises engagées, la validation et les gains dès le premier pari."
              : "The room is ready: it will show your tickets, staked tokens, validation, and winnings after the first bet."}
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step, idx) => (
          <div key={step.title} className="rounded-[8px] border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="mb-3 flex size-7 items-center justify-center rounded-[8px] bg-primary-500/[0.1] font-display text-sm font-bold text-primary-400 ring-1 ring-primary-500/25">
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

