"use client";

import { useState } from "react";
import { Flag } from "@/components/team/flag";
import type { MatchListItem } from "@/lib/matches/shared";
import type { PlayerOption } from "@/components/picks/player-combobox";
import { PerMatchPicker } from "./per-match-picker";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { MatchPick, ScorerPick, TeamLite, Winner } from "./predict-board";

/**
 * One group's card. Two parts stacked:
 *   1. 4 team rows with ↑/↓ buttons to reorder (1st → 4th).
 *   2. Collapsible "Matchs du groupe" — the 6 fixtures with per-match
 *      winner / total / scorer picks.
 */
export function GroupCard({
  label,
  teams,
  allTeams,
  matches,
  matchPicks,
  playersByTeam,
  teamById,
  canEdit,
  canBet,
  onMove,
  onSavePerMatch,
  locale,
}: {
  label: string;
  teams: string[];
  allTeams: TeamLite[];
  matches: MatchListItem[];
  matchPicks: Map<string, MatchPick>;
  playersByTeam: Map<string, PlayerOption[]>;
  teamById: Map<string, TeamLite>;
  canEdit: boolean;
  canBet: boolean;
  onMove: (idx: number, direction: -1 | 1) => void;
  onSavePerMatch: (
    matchId: string,
    update: (prev: MatchPick) => MatchPick,
    bet:
      | { kind: "winner"; winner: Winner }
      | { kind: "total_goals"; total: number }
      | { kind: "scorers"; picks: ScorerPick[] },
  ) => void;
  locale: Locale;
}) {
  const [matchesOpen, setMatchesOpen] = useState(false);
  const ordered =
    teams.length === 4
      ? (teams.map((id) => teamById.get(id)).filter(Boolean) as TeamLite[])
      : allTeams;

  const pickedMatchesCount = matches.filter(
    (m) => matchPicks.get(m.id)?.winner,
  ).length;

  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.5] backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <span className="font-display text-sm font-bold text-text-primary">
          {locale === "fr" ? "Groupe" : "Group"} {label}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
          {locale === "fr" ? "1ᵉʳ → 4ᵉ" : "1st → 4th"}
        </span>
      </div>

      {/* Ranker (4 teams) */}
      <ol className="space-y-1.5 p-3">
        {ordered.map((t, i) => (
          <li
            key={t.id}
            className={cn(
              "grid grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[6px] border px-2 py-1.5 text-xs transition",
              i === 0
                ? "border-gold-500/35 bg-gold-500/[0.06]"
                : i === 1
                  ? "border-primary-500/25 bg-primary-500/[0.05]"
                  : "border-white/[0.06] bg-white/[0.03]",
            )}
          >
            <span
              className={cn(
                "font-display text-xs font-bold tabular-nums",
                i === 0
                  ? "text-gold-300"
                  : i === 1
                    ? "text-primary-300"
                    : "text-text-tertiary",
              )}
            >
              {i + 1}
            </span>
            <Flag isoCode={t.iso_code} size="sm" />
            <span className="truncate font-semibold text-text-primary">
              {locale === "fr" ? t.name_fr : t.name_en}
            </span>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => onMove(i, -1)}
                disabled={!canEdit || i === 0}
                aria-label="Promote"
                className="rounded-md p-0.5 text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp className="size-3" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => onMove(i, 1)}
                disabled={!canEdit || i === ordered.length - 1}
                aria-label="Demote"
                className="rounded-md p-0.5 text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDown className="size-3" strokeWidth={2.5} />
              </button>
            </div>
          </li>
        ))}
      </ol>

      {/* Matches toggle */}
      <button
        type="button"
        onClick={() => setMatchesOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between border-t border-white/[0.06] px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition",
          matchesOpen
            ? "bg-primary-500/[0.08] text-primary-300"
            : "text-text-tertiary hover:bg-white/[0.04] hover:text-text-primary",
        )}
      >
        <span>
          {locale === "fr" ? "Pronos par match" : "Per-match picks"}
          <span className="ml-1.5 font-mono normal-case text-text-tertiary">
            ({pickedMatchesCount}/{matches.length})
          </span>
        </span>
        <ChevronDown
          className={cn("size-3 transition-transform", matchesOpen && "rotate-180")}
          strokeWidth={2.5}
        />
      </button>

      {matchesOpen && (
        <ul className="divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {matches.map((m) => (
            <PerMatchPicker
              key={m.id}
              match={m}
              pick={matchPicks.get(m.id) ?? { winner: null, total_goals: null, scorers: [] }}
              homePlayers={
                m.home_team
                  ? (playersByTeam.get(m.home_team.id) ?? [])
                  : []
              }
              awayPlayers={
                m.away_team
                  ? (playersByTeam.get(m.away_team.id) ?? [])
                  : []
              }
              canEdit={canBet}
              onWinner={(w) =>
                onSavePerMatch(
                  m.id,
                  (prev) => ({ ...prev, winner: w }),
                  { kind: "winner", winner: w },
                )
              }
              onTotalGoals={(n) =>
                onSavePerMatch(
                  m.id,
                  (prev) => ({ ...prev, total_goals: n }),
                  { kind: "total_goals", total: n },
                )
              }
              onScorers={(picks) =>
                onSavePerMatch(
                  m.id,
                  (prev) => ({ ...prev, scorers: picks }),
                  { kind: "scorers", picks },
                )
              }
              locale={locale}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
