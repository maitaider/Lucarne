"use client";

import { Flag } from "@/components/team/flag";
import { Tooltip } from "@/components/ui/tooltip";
import {
  resolveMatch,
  type GroupStandings,
  type KnockoutWinners,
} from "@/lib/predictions/resolve-bracket";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { KnockoutScheduleItem, TeamLite } from "./predict-board";

/**
 * One knockout tie row.
 *  - Two team slots resolved from groups + upstream knockout picks.
 *  - Click a team to crown it as the tie winner (advances downstream).
 */
export function KnockoutTie({
  match,
  groups,
  knockouts,
  thirdAssign,
  teamById,
  canEdit,
  onPickWinner,
  onPickThirdPlace,
  locale,
}: {
  match: KnockoutScheduleItem;
  groups: GroupStandings;
  knockouts: KnockoutWinners;
  thirdAssign: Record<string, string>;
  teamById: Map<string, TeamLite>;
  canEdit: boolean;
  onPickWinner: (matchNumber: number, teamId: string) => void;
  onPickThirdPlace: (
    matchNumber: number,
    side: "home" | "away",
    teamId: string,
  ) => void;
  locale: Locale;
}) {
  const { home, away } = resolveMatch(match, groups, knockouts, thirdAssign);
  const winnerId = knockouts[String(match.match_number)] ?? null;

  return (
    <li className="overflow-hidden rounded-md border border-white/[0.08] bg-surface-2/70 shadow-card transition hover:border-white/[0.16]">
      {/* Tie — two stacked team slots; tap one to send it to the next round. */}
      <div className="flex flex-col divide-y divide-white/[0.06]">
        <KnockoutSlot
          teamId={home.team_id}
          isThirdPool={home.is_third_place_pool}
          candidateGroups={home.third_place_candidate_groups}
          side="home"
          match={match}
          groups={groups}
          teamById={teamById}
          thirdAssign={thirdAssign}
          picked={winnerId === home.team_id && !!home.team_id}
          canEdit={canEdit}
          onPickWinner={(id) => onPickWinner(match.match_number, id)}
          onPickThirdPlace={onPickThirdPlace}
          locale={locale}
        />
        <KnockoutSlot
          teamId={away.team_id}
          isThirdPool={away.is_third_place_pool}
          candidateGroups={away.third_place_candidate_groups}
          side="away"
          match={match}
          groups={groups}
          teamById={teamById}
          thirdAssign={thirdAssign}
          picked={winnerId === away.team_id && !!away.team_id}
          canEdit={canEdit}
          onPickWinner={(id) => onPickWinner(match.match_number, id)}
          onPickThirdPlace={onPickThirdPlace}
          locale={locale}
        />
      </div>
    </li>
  );
}

function KnockoutSlot({
  teamId,
  isThirdPool,
  candidateGroups,
  side,
  match,
  groups,
  teamById,
  thirdAssign,
  picked,
  canEdit,
  onPickWinner,
  onPickThirdPlace,
  locale,
}: {
  teamId: string | null;
  isThirdPool: boolean;
  candidateGroups: string[];
  side: "home" | "away";
  match: KnockoutScheduleItem;
  groups: GroupStandings;
  teamById: Map<string, TeamLite>;
  thirdAssign: Record<string, string>;
  picked: boolean;
  canEdit: boolean;
  onPickWinner: (teamId: string) => void;
  onPickThirdPlace: (
    matchNumber: number,
    side: "home" | "away",
    teamId: string,
  ) => void;
  locale: Locale;
}) {
  const placeholder =
    side === "home" ? match.home_placeholder : match.away_placeholder;

  if (isThirdPool && !teamId) {
    const options = candidateGroups
      .map((g) => groups[g]?.[2] ?? null)
      .filter((id): id is string => !!id)
      .map((id) => teamById.get(id))
      .filter((t): t is TeamLite => !!t);
    return (
      <div className="flex w-full min-w-0 items-center gap-1 px-2 py-1.5 text-xs">
        <Tooltip
          content={
            locale === "fr"
              ? `3ᵉ d'un des groupes ${candidateGroups.join(", ")}.`
              : `3rd-placed of groups ${candidateGroups.join(", ")}.`
          }
        >
          <select
            value={thirdAssign[`${match.match_number}-${side}`] ?? ""}
            onChange={(e) =>
              onPickThirdPlace(match.match_number, side, e.target.value)
            }
            disabled={!canEdit || options.length === 0}
            className="w-full rounded-xs border border-violet-500/30 bg-abyss/[0.5] px-1.5 py-1 text-[10px] text-text-secondary outline-none focus:border-violet-500/50 disabled:opacity-50"
          >
            <option value="">
              {locale === "fr"
                ? `3ᵉ ${candidateGroups.join("/")}`
                : `3rd ${candidateGroups.join("/")}`}
            </option>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {locale === "fr" ? t.name_fr : t.name_en}
              </option>
            ))}
          </select>
        </Tooltip>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="flex w-full min-w-0 items-center gap-2 px-2.5 py-2 text-xs text-text-tertiary">
        <span className="truncate font-mono text-[10px] italic">
          {placeholder ?? "—"}
        </span>
      </div>
    );
  }

  const t = teamById.get(teamId);
  if (!t) return null;
  const name = locale === "fr" ? t.name_fr : t.name_en;

  return (
    <button
      type="button"
      onClick={() => canEdit && onPickWinner(teamId)}
      disabled={!canEdit}
      title={
        !canEdit
          ? undefined
          : picked
            ? locale === "fr"
              ? "Cliquer pour annuler"
              : "Click to cancel"
            : locale === "fr"
              ? `Désigner ${name} vainqueur`
              : `Pick ${name} to advance`
      }
      className={cn(
        "group flex w-full min-w-0 items-center gap-2 px-2.5 py-2 text-xs transition disabled:cursor-not-allowed",
        picked
          ? "bg-primary-500/[0.18] font-bold text-primary-100 hover:bg-error/[0.12]"
          : canEdit
            ? "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
            : "text-text-secondary",
      )}
    >
      <Flag isoCode={t.iso_code} size="sm" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {picked && (
        <span className="relative ml-auto inline-flex size-4 shrink-0">
          <CheckCircle2
            className="absolute inset-0 size-4 text-primary-300 transition group-hover:opacity-0"
            strokeWidth={2.5}
          />
          <XCircle
            className="absolute inset-0 size-4 text-error opacity-0 transition group-hover:opacity-100"
            strokeWidth={2.5}
          />
        </span>
      )}
    </button>
  );
}
