import { getLocale } from "next-intl/server";
import { listMatches } from "@/lib/matches/queries";
import { listPlayersForTeams } from "@/lib/players/queries";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  MatchResultsAdmin,
  type ExistingScorer,
} from "@/components/admin/match-results-admin";
import { Goal } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function AdminMatchesPage() {
  const locale = (await getLocale()) as Locale;
  const fr = locale === "fr";
  const matches = await listMatches();

  // Pre-fill data so reopening a match doesn't silently wipe its scorers.
  const scorersByMatch: Record<string, ExistingScorer[]> = {};
  const teamIds = new Set<string>();
  for (const m of matches) {
    if (m.home_team?.id) teamIds.add(m.home_team.id);
    if (m.away_team?.id) teamIds.add(m.away_team.id);
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await getSupabaseServer();
    const { data: events, error: eventsError } = await supabase
      .schema("ref")
      .from("match_events")
      .select("match_id, player_name, team_id, minute, event_type")
      .in("event_type", ["goal", "penalty_goal", "own_goal"])
      .order("minute", { ascending: true });
    if (eventsError) {
      console.error("admin/matches: failed to load match_events", eventsError);
    }
    for (const e of events ?? []) {
      if (!e.match_id || !e.player_name) continue;
      (scorersByMatch[e.match_id] ??= []).push({
        player_name: e.player_name,
        team_id: e.team_id ?? null,
        minute: e.minute != null ? String(e.minute) : "",
        event_type:
          (e.event_type as ExistingScorer["event_type"]) ?? "goal",
      });
    }
  }

  // Roster display names per team → scorer typeahead suggestions.
  const players = await listPlayersForTeams(Array.from(teamIds));
  const rosterByTeam: Record<string, string[]> = {};
  for (const p of players) {
    (rosterByTeam[p.team_id] ??= []).push(p.display_name);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30">
          <Goal className="size-5" strokeWidth={1.6} />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {fr ? "Résultats des matchs" : "Match results"}
          </h2>
          <p className="mt-0.5 max-w-2xl text-sm text-text-tertiary">
            {fr
              ? "Saisis le score et les buteurs de chaque match. Passe le statut à « Terminé » pour régler automatiquement les pronostics. Corriger un match déjà terminé recalcule les points pour tout le monde."
              : "Enter the score and scorers for each match. Set the status to “Finished” to settle predictions automatically. Correcting an already-finished match recomputes everyone's points."}
          </p>
        </div>
      </div>

      <MatchResultsAdmin
        matches={matches}
        scorersByMatch={scorersByMatch}
        rosterByTeam={rosterByTeam}
        locale={locale}
      />
    </div>
  );
}
