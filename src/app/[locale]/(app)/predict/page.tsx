import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { listMatches } from "@/lib/matches/queries";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { getMyTournamentPrediction } from "@/lib/predictions/queries";
import { getMyPicksByMatch } from "@/lib/bets/my-picks";
import { listPlayersForTeams } from "@/lib/players/queries";
import { PredictBoard } from "@/components/predict/predict-board";
import { Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/**
 * `/predict` — the merged prediction surface.
 * Replaces /bracket (group rankings + knockout) and /picks (per-match
 * winner/goals/scorers) with a single page split in two segments:
 *   - Groupes: 12 group cards, each with team-ranker + 6 collapsible
 *     group matches (1/N/2 + total goals + scorers).
 *   - Phase finale: auto-resolved bracket tree, each tie with winner
 *     buttons + inline +Plus for goals/scorers.
 *
 * Old routes (/bracket, /picks) 308-redirect here.
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

  // Hydrate group teams (sourced from match schedule).
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

  // Players for the scorer combobox (every team that plays in the tournament).
  const teamIds = Array.from(teamMap.keys());
  const allPlayers = await listPlayersForTeams(teamIds);

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

  // Knockout schedule for the bracket tree.
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

  // Group matches (the 72 fixtures of the group phase).
  const groupMatches = allMatches.filter((m) => m.stage === "group");

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <header className="relative mb-6 overflow-hidden rounded-[12px] border border-white/[0.13] bg-abyss/[0.8] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7">
        <Image
          src="/marketing/lucarne-hero-stadium.jpg"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-[60%_44%] opacity-[0.2]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(96deg,rgba(5,6,5,0.94)_0%,rgba(5,6,5,0.78)_44%,rgba(5,6,5,0.5)_100%)]" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-gold-500/35 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-300 shadow-glow-gold">
            <Sparkles className="size-3.5" strokeWidth={1.7} />
            {L === "fr" ? "Pronostique" : "Predict"}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            {L === "fr"
              ? "Ton pronostic complet du Mondial"
              : "Your full World Cup prediction"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {L === "fr"
              ? "Phase de groupes : classe les équipes + parie sur chaque match. Phase finale : bâtis ton arbre jusqu'au champion. Tout sur une page, sauvegardé tout seul."
              : "Group phase: rank teams + bet on every match. Knockouts: build your bracket to the champion. All in one page, auto-saved."}
          </p>
        </div>
      </header>

      <PredictBoard
        initialTab={tab}
        groupTeams={groupTeams}
        groupMatches={groupMatches}
        knockoutSchedule={knockoutSchedule}
        initialPrediction={prediction}
        initialPicks={picksSnapshot}
        players={allPlayers}
        canEdit={buyIn.can_bet && !prediction.locked_at}
        canBet={buyIn.can_bet}
        buyInAmountCents={buyIn.amount_cents}
        currency={buyIn.settings.currency}
        deadlineAt={buyIn.deadline_at}
        deadlinePassed={buyIn.deadline_passed}
        locale={L}
      />
    </main>
  );
}
