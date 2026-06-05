import { setRequestLocale } from "next-intl/server";
import { listMatches } from "@/lib/matches/queries";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { getMyTournamentPrediction } from "@/lib/predictions/queries";
import { getMyPicksByMatch } from "@/lib/bets/my-picks";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { PredictBoard } from "@/components/predict/predict-board";
import { Sparkles, Trophy } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/**
 * `/predict` — merged prediction surface (groups ranking + per-match
 * picks + knockout bracket). See PredictBoard for the working UI; this
 * file owns the data fetch + hero shell.
 */
export default async function PredictPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const L = locale as Locale;

  const tab: "groupes" | "finale" =
    sp.tab === "finale" ? "finale" : "groupes";

  const [allMatches, buyIn, prediction, myPicksByMatch] = await Promise.all([
    listMatches(),
    getMyBuyInStatus(),
    getMyTournamentPrediction(),
    getMyPicksByMatch(),
  ]);

  // Hydrate group teams from match schedule.
  const teamMap = new Map<
    string,
    {
      id: string;
      fifa_code: string;
      iso_code: string | null;
      name_fr: string;
      name_en: string;
    }
  >();
  const groupTeams: Record<
    string,
    {
      id: string;
      fifa_code: string;
      iso_code: string | null;
      name_fr: string;
      name_en: string;
    }[]
  > = {};
  for (const m of allMatches) {
    if (m.stage !== "group" || !m.group_label) continue;
    for (const t of [m.home_team, m.away_team]) {
      if (!t) continue;
      if (!teamMap.has(t.id)) {
        teamMap.set(t.id, {
          id: t.id,
          fifa_code: t.fifa_code,
          iso_code: t.iso_code,
          name_fr: t.name_fr,
          name_en: t.name_en,
        });
      }
      const list = (groupTeams[m.group_label] ??= []);
      if (!list.some((x) => x.id === t.id)) list.push(teamMap.get(t.id)!);
    }
  }

  // Serialize picks Map → plain object for client boundary.
  const picksSnapshot: Record<
    string,
    { bet_type: string; payload: unknown; status: string }[]
  > = {};
  for (const [matchId, picks] of myPicksByMatch.entries()) {
    picksSnapshot[matchId] = picks.map((p) => ({
      bet_type: p.bet_type,
      payload: p.payload,
      status: p.status,
    }));
  }

  const knockoutSchedule = allMatches
    .filter((m) => m.stage !== "group")
    .map((m) => ({
      match_number: m.match_number ?? 0,
      stage: m.stage as
        | "r32"
        | "r16"
        | "qf"
        | "sf"
        | "third_place"
        | "final",
      home_placeholder: m.home_placeholder,
      away_placeholder: m.away_placeholder,
      kickoff_at: m.kickoff_at,
    }));

  const groupMatches = allMatches.filter((m) => m.stage === "group");

  // Celebration photo for the hero visual (same for both tabs).
  const heroVisual = {
    src: "/assets/lucarne/world-cup-2026/11-algeria-2026-home-celebration.png",
    alt:
      L === "fr"
        ? "Footballeur en maillot domicile de l'Algérie célébrant dans un stade plein."
        : "Footballer in an Algeria home kit celebrating in a packed stadium.",
  };

  // Stat chips for the hero — small, scannable, motivational.
  const groupsFilled = Object.values(prediction.group_standings).filter(
    (g) => g.length === 4,
  ).length;
  const knockoutPicked = Object.keys(prediction.knockout_winners).length;

  return (
    <AppPageShell width="ultra">
      <PageHero
        kicker={L === "fr" ? "Pronostique" : "Predict"}
        kickerIcon={Sparkles}
        accent="gold"
        title={
          L === "fr"
            ? "Ton pronostic complet du Mondial"
            : "Your full World Cup prediction"
        }
        description={
          L === "fr"
            ? "Phase de groupes : pronostique chaque match puis confirme ton pronostic. Phase finale : bâtis ton arbre jusqu'au champion. Tout sur une page."
            : "Group phase: predict every match, then confirm your prediction. Knockouts: build your bracket all the way to the champion. One page."
        }
        stats={
          <>
            <HeroStat
              icon={Sparkles}
              label={L === "fr" ? "Groupes" : "Groups"}
              value={`${groupsFilled}/12`}
              tone="primary"
            />
            <HeroStat
              icon={Trophy}
              label={L === "fr" ? "Phase finale" : "Knockouts"}
              value={`${knockoutPicked}/32`}
              tone="gold"
            />
          </>
        }
        visual={heroVisual}
      />

      <PredictBoard
        initialTab={tab}
        groupTeams={groupTeams}
        groupMatches={groupMatches}
        knockoutSchedule={knockoutSchedule}
        initialPrediction={prediction}
        initialPicks={picksSnapshot}
        canEdit={buyIn.can_bet && !prediction.locked_at}
        canBet={buyIn.can_bet}
        buyInAmountCents={buyIn.amount_cents}
        currency={buyIn.settings.currency}
        deadlineAt={buyIn.deadline_at}
        deadlinePassed={buyIn.deadline_passed}
        locale={L}
      />
    </AppPageShell>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  tone: "primary" | "gold" | "violet";
}) {
  const cls = {
    primary: "border-primary-500/30 bg-primary-500/[0.08] text-primary-300",
    gold: "border-gold-500/35 bg-gold-500/[0.08] text-gold-300",
    violet: "border-violet-500/30 bg-violet-500/[0.08] text-violet-300",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      <Icon className="size-3" strokeWidth={2} />
      {label}
      <span className="font-mono normal-case text-text-primary">{value}</span>
    </span>
  );
}
