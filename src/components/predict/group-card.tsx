"use client";

import { useState } from "react";
import { Flag } from "@/components/team/flag";
import type { MatchListItem } from "@/lib/matches/shared";
import type { PlayerOption } from "@/components/picks/player-combobox";
import { PerMatchPicker } from "./per-match-picker";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
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
    <div className="rounded-md border border-border-subtle bg-surface-1 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <span className="font-display text-sm font-bold text-text-primary">
          {locale === "fr" ? "Groupe" : "Group"} {label}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          <ArrowUpDown className="size-3" strokeWidth={2} />
          {locale === "fr" ? "1ᵉʳ → 4ᵉ" : "1st → 4th"}
        </span>
      </div>

      {/* Ranker (4 teams) — the ↑/↓ steppers reorder the standings. */}
      <ol className="space-y-1.5 p-3">
        {ordered.map((t, i) => {
          const isFirst = i === 0;
          const isSecond = i === 1;
          return (
            <li
              key={t.id}
              className={cn(
                "grid grid-cols-[1.75rem_auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-sm border px-2 py-2 text-xs transition",
                isFirst
                  ? "border-gold-500/35 bg-gold-500/[0.07]"
                  : isSecond
                    ? "border-primary-500/25 bg-primary-500/[0.06]"
                    : "border-border-subtle bg-white/[0.025]",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full font-display text-xs font-bold tabular-nums",
                  isFirst
                    ? "bg-gold-500/20 text-gold-200 ring-1 ring-gold-500/40"
                    : isSecond
                      ? "bg-primary-500/20 text-primary-200 ring-1 ring-primary-500/35"
                      : "bg-white/[0.06] text-text-tertiary ring-1 ring-white/[0.08]",
                )}
              >
                {i + 1}
              </span>
              <Flag isoCode={t.iso_code} size="md" />
              <span className="truncate font-semibold text-text-primary">
                {locale === "fr" ? t.name_fr : t.name_en}
              </span>
              <div className="flex shrink-0 flex-col overflow-hidden rounded-sm border border-border-strong/50">
                <button
                  type="button"
                  onClick={() => onMove(i, -1)}
                  disabled={!canEdit || i === 0}
                  aria-label={locale === "fr" ? "Monter" : "Move up"}
                  className="flex h-5 w-7 items-center justify-center text-text-secondary transition hover:bg-primary-500/20 hover:text-primary-200 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
                >
                  <ArrowUp className="size-3.5" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(i, 1)}
                  disabled={!canEdit || i === ordered.length - 1}
                  aria-label={locale === "fr" ? "Descendre" : "Move down"}
                  className="flex h-5 w-7 items-center justify-center border-t border-border-strong/50 text-text-secondary transition hover:bg-primary-500/20 hover:text-primary-200 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
                >
                  <ArrowDown className="size-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </li>
          );
        })}
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
