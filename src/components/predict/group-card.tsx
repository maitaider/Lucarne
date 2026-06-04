"use client";

import { Flag } from "@/components/team/flag";
import type { MatchListItem } from "@/lib/matches/shared";
import { PerMatchPicker } from "./per-match-picker";
import { computeGroupOrder } from "@/lib/predictions/group-order";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import {
  matchDraftStatus,
  type ConfirmMatchFn,
  type EditDraftFn,
  type MatchPick,
  type TeamLite,
} from "./predict-board";

/**
 * One group's card. "Predict the matches" model:
 *   1. A standings strip computed from the CONFIRMED results only — the
 *      top 2 qualify, the 3rd goes to the repechage pool.
 *   2. The 6 group fixtures, each with a scoreline stepper. Edits stay a
 *      local draft; clicking "Confirmer" on a row persists it and re-ranks
 *      the table above. Unconfirmed drafts never move the standings (so the
 *      table always mirrors what is saved).
 */
export function GroupCard({
  label,
  teams,
  allTeams,
  matches,
  matchPicks,
  draftPicks,
  pendingMatchIds,
  teamById,
  canEdit,
  canBet,
  onEditDraft,
  onConfirmMatch,
  locale,
}: {
  label: string;
  /** Saved order — used as the stable tiebreak fallback. */
  teams: string[];
  allTeams: TeamLite[];
  matches: MatchListItem[];
  /** Confirmed picks — feed the standings strip below. */
  matchPicks: Map<string, MatchPick>;
  /** Local unsaved drafts — shown in each row, but NOT in the standings. */
  draftPicks: Map<string, MatchPick>;
  pendingMatchIds: Set<string>;
  teamById: Map<string, TeamLite>;
  canEdit: boolean;
  canBet: boolean;
  onEditDraft: EditDraftFn;
  onConfirmMatch: ConfirmMatchFn;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const teamIds = allTeams.map((t) => t.id);
  const fallback = teams.length === teamIds.length && teams.length > 0 ? teams : teamIds;

  const { order, stats } = computeGroupOrder(
    matches.map((m) => {
      const p = matchPicks.get(m.id);
      return {
        home_team_id: m.home_team?.id ?? null,
        away_team_id: m.away_team?.id ?? null,
        home_goals: p?.home_goals ?? null,
        away_goals: p?.away_goals ?? null,
      };
    }),
    teamIds,
    fallback,
  );
  const ordered = order
    .map((id) => teamById.get(id))
    .filter((t): t is TeamLite => Boolean(t));

  const pickedCount = matches.filter((m) => {
    const p = matchPicks.get(m.id);
    return p?.home_goals != null && p?.away_goals != null;
  }).length;

  return (
    <div className="overflow-hidden rounded-md border border-border-subtle bg-surface-1 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <span className="font-display text-sm font-bold text-text-primary">
          {fr ? "Groupe" : "Group"} {label}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-text-tertiary">
          {pickedCount}/{matches.length} {fr ? "matchs" : "matches"}
        </span>
      </div>

      {/* Live standings (computed from the predicted results) */}
      <div className="space-y-1 bg-abyss/30 p-2.5">
        <div className="mb-1 flex items-center gap-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          <ListChecks className="size-3 text-primary-400" strokeWidth={2} />
          {fr ? "Classement selon tes pronos" : "Standings from your picks"}
        </div>
        {ordered.map((t, i) => {
          const qualified = i <= 1;
          const playoff = i === 2;
          const st = stats[t.id];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-2 rounded-sm border px-2 py-1.5 text-xs",
                qualified
                  ? "border-primary-500/30 bg-primary-500/[0.06]"
                  : playoff
                    ? "border-gold-500/30 bg-gold-500/[0.06]"
                    : "border-border-subtle bg-white/[0.02]",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-bold tabular-nums",
                  qualified
                    ? "bg-primary-500/20 text-primary-200 ring-1 ring-primary-500/40"
                    : playoff
                      ? "bg-gold-500/20 text-gold-200 ring-1 ring-gold-500/40"
                      : "bg-white/[0.06] text-text-tertiary ring-1 ring-white/[0.08]",
                )}
              >
                {i + 1}
              </span>
              <Flag isoCode={t.iso_code} size="sm" />
              <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">
                {fr ? t.name_fr : t.name_en}
              </span>
              {(qualified || playoff) && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    qualified
                      ? "bg-primary-500/15 text-primary-300"
                      : "bg-gold-500/15 text-gold-300",
                  )}
                >
                  {qualified
                    ? fr
                      ? "Qualifié"
                      : "Through"
                    : fr
                      ? "Repêchage"
                      : "Playoff"}
                </span>
              )}
              <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-text-secondary">
                {st?.points ?? 0}
                <span className="ml-0.5 text-[8px] font-medium text-text-tertiary">
                  pts
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* The 6 fixtures — the primary interaction. */}
      <div className="border-t border-white/[0.06]">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {fr ? "Tape le résultat de chaque match" : "Tap each match result"}
        </div>
        <ul className="divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {matches.map((m) => {
            const status = matchDraftStatus(m.id, matchPicks, draftPicks);
            return (
              <PerMatchPicker
                key={m.id}
                match={m}
                pick={status.effective}
                dirty={status.dirty}
                confirmed={status.confirmed}
                pending={pendingMatchIds.has(m.id)}
                canEdit={canBet && canEdit}
                onScore={(home, away) =>
                  onEditDraft(m.id, (prev) => ({
                    ...prev,
                    home_goals: home,
                    away_goals: away,
                  }))
                }
                onConfirm={() => onConfirmMatch(m.id)}
                locale={locale}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}
