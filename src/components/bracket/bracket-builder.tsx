"use client";

import { useMemo, useState, useTransition } from "react";
import { Flag } from "@/components/team/flag";
import { BuyInBanner } from "@/components/paywall/buy-in-banner";
import { useToast } from "@/components/ui/toast-provider";
import {
  pruneOrphanedKnockoutPicks,
  resolveMatch,
  type BracketMatchInfo,
  type GroupStandings,
  type KnockoutWinners,
} from "@/lib/predictions/resolve-bracket";
import { upsertTournamentPrediction } from "@/lib/predictions/actions";
import type { TournamentPrediction } from "@/lib/predictions/queries";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Crown,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export type TeamLite = {
  id: string;
  fifa_code: string;
  iso_code: string | null;
  name_fr: string;
  name_en: string;
};

export type KnockoutScheduleItem = BracketMatchInfo & {
  kickoff_at: string;
};

export function BracketBuilder({
  groupTeams,
  knockoutSchedule,
  initialPrediction,
  canEdit,
  canBet,
  buyInAmountCents,
  currency,
  deadlineAt,
  deadlinePassed,
  locale,
}: {
  groupTeams: Record<string, TeamLite[]>;
  knockoutSchedule: KnockoutScheduleItem[];
  initialPrediction: TournamentPrediction;
  canEdit: boolean;
  canBet: boolean;
  buyInAmountCents: number;
  currency: string;
  deadlineAt: string;
  deadlinePassed: boolean;
  locale: Locale;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  // Local state derived from server snapshot. We auto-save after each edit.
  const [groups, setGroups] = useState<GroupStandings>(
    () => hydrateGroups(initialPrediction.group_standings, groupTeams),
  );
  const [knockouts, setKnockouts] = useState<KnockoutWinners>(
    () => ({ ...initialPrediction.knockout_winners }),
  );
  /**
   * For R32 "third-place pool" slots (e.g. "3ACDF" = third-placed team from
   * one of A/C/D/F). Key: `${match_number}-home` / `${match_number}-away`.
   */
  const [thirdAssign, setThirdAssign] = useState<Record<string, string>>({});

  const teamById = useMemo(() => {
    const map = new Map<string, TeamLite>();
    for (const arr of Object.values(groupTeams))
      for (const t of arr) map.set(t.id, t);
    return map;
  }, [groupTeams]);

  const finalMatch = useMemo(
    () => knockoutSchedule.find((m) => m.stage === "final"),
    [knockoutSchedule],
  );

  // Champion = winner of the final match.
  const championId = finalMatch
    ? (knockouts[String(finalMatch.match_number)] ?? null)
    : null;

  // Push every change to the server. Debounced via React's transition.
  function save(next: {
    groups: GroupStandings;
    knockouts: KnockoutWinners;
    championId: string | null;
  }) {
    if (!canEdit) return;
    startTransition(async () => {
      const res = await upsertTournamentPrediction({
        group_standings: next.groups,
        knockout_winners: next.knockouts,
        champion_team_id: next.championId,
      });
      if (!res.ok) {
        toast.error(res.message);
      }
    });
  }

  // Group reorder: bump idx → idx-1 (up) or idx+1 (down). Re-validate
  // downstream knockout picks afterwards.
  function moveTeam(group: string, idx: number, direction: -1 | 1) {
    if (!canEdit) return;
    const list = groups[group] ?? [];
    const target = idx + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    const nextGroups = { ...groups, [group]: next };
    const pruned = pruneOrphanedKnockoutPicks(
      knockoutSchedule,
      nextGroups,
      knockouts,
      thirdAssign,
    );
    setGroups(nextGroups);
    setKnockouts(pruned);
    save({
      groups: nextGroups,
      knockouts: pruned,
      championId: pickChampion(finalMatch, pruned),
    });
  }

  // Pick the winner of a knockout match.
  function pickKnockout(matchNumber: number, teamId: string) {
    if (!canEdit) return;
    const next = { ...knockouts, [String(matchNumber)]: teamId };
    const pruned = pruneOrphanedKnockoutPicks(
      knockoutSchedule,
      groups,
      next,
      thirdAssign,
    );
    setKnockouts(pruned);
    save({
      groups,
      knockouts: pruned,
      championId: pickChampion(finalMatch, pruned),
    });
  }

  // Choose which team from a 3rd-place pool fills a specific R32 slot.
  function pickThirdPlace(matchNumber: number, side: "home" | "away", teamId: string) {
    if (!canEdit) return;
    const key = `${matchNumber}-${side}`;
    const nextAssign = { ...thirdAssign, [key]: teamId };
    setThirdAssign(nextAssign);
    // Re-prune in case this freshly-filled slot now invalidates a downstream pick.
    const pruned = pruneOrphanedKnockoutPicks(
      knockoutSchedule,
      groups,
      knockouts,
      nextAssign,
    );
    setKnockouts(pruned);
    save({
      groups,
      knockouts: pruned,
      championId: pickChampion(finalMatch, pruned),
    });
  }

  // Counters for the progress strip
  const groupsFilledCount = Object.values(groups).filter(
    (g) => g.length === 4,
  ).length;
  const knockoutPickedCount = Object.keys(knockouts).length;
  const totalKnockouts = knockoutSchedule.length;
  const totalGroups = Object.keys(groupTeams).length;
  const pctDone = Math.round(
    ((groupsFilledCount + knockoutPickedCount) /
      Math.max(totalGroups + totalKnockouts, 1)) *
      100,
  );

  // Group placeholder sets sorted by group letter (A → L).
  const groupLetters = useMemo(
    () => Object.keys(groupTeams).sort(),
    [groupTeams],
  );

  // Knockout matches grouped by stage, sorted by match_number.
  const byStage = useMemo(() => {
    const out: Record<string, KnockoutScheduleItem[]> = {};
    for (const m of knockoutSchedule) {
      (out[m.stage] ??= []).push(m);
    }
    for (const arr of Object.values(out))
      arr.sort((a, b) => a.match_number - b.match_number);
    return out;
  }, [knockoutSchedule]);

  return (
    <div className="space-y-6">
      {!canBet && (
        <BuyInBanner
          amountCents={buyInAmountCents}
          currency={currency}
          deadlineAt={deadlineAt}
          deadlinePassed={deadlinePassed}
          locale={locale}
        />
      )}

      {/* Sticky progress strip */}
      <section className="sticky top-[64px] z-30 rounded-[12px] border border-white/[0.1] bg-abyss/[0.85] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-[8px] border border-gold-500/35 bg-gold-500/[0.1] text-gold-300">
              <Trophy className="size-4" strokeWidth={1.8} />
            </span>
            <div>
              <div className="font-display text-base font-semibold tabular-nums text-text-primary">
                {groupsFilledCount}/{totalGroups}{" "}
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  {locale === "fr" ? "groupes" : "groups"}
                </span>
                <span className="mx-2 text-text-tertiary">·</span>
                {knockoutPickedCount}/{totalKnockouts}{" "}
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  {locale === "fr" ? "ties" : "ties"}
                </span>
              </div>
              <div className="text-[10px] text-text-tertiary">
                {!canEdit && initialPrediction.locked_at
                  ? locale === "fr"
                    ? "Verrouillé"
                    : "Locked"
                  : `${pctDone}% ${locale === "fr" ? "rempli" : "filled"}`}
              </div>
            </div>
          </div>

          <ChampionPill
            championId={championId}
            teamById={teamById}
            locale={locale}
            saving={isPending}
          />
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-gold-400 transition-[width] duration-300"
            style={{ width: `${pctDone}%` }}
          />
        </div>
      </section>

      {/* Groups */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            1.
          </span>
          {locale === "fr" ? "Classe les groupes" : "Rank the groups"}
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groupLetters.map((label) => (
            <GroupRanker
              key={label}
              label={label}
              teams={groups[label] ?? []}
              allTeams={groupTeams[label] ?? []}
              teamById={teamById}
              canEdit={canEdit}
              onMove={(idx, dir) => moveTeam(label, idx, dir)}
              locale={locale}
            />
          ))}
        </div>
      </section>

      {/* Knockout */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            2.
          </span>
          {locale === "fr" ? "Phase finale" : "Knockouts"}
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          {(
            [
              ["r32", locale === "fr" ? "1/16ᵉ de finale" : "Round of 32"],
              ["r16", locale === "fr" ? "1/8ᵉ" : "Round of 16"],
              ["qf", locale === "fr" ? "Quarts" : "Quarter-finals"],
              ["sf", locale === "fr" ? "Demi-finales" : "Semi-finals"],
              ["third_place", locale === "fr" ? "3ᵉ place" : "3rd place"],
              ["final", locale === "fr" ? "Finale" : "Final"],
            ] as const
          ).map(([stage, label]) => (
            <article
              key={stage}
              className={cn(
                "rounded-[12px] border border-white/[0.08] bg-surface-1/[0.6] p-4 backdrop-blur-xl",
                stage === "final" && "border-gold-500/40 bg-gold-500/[0.06]",
              )}
            >
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-tertiary">
                {stage === "final" && (
                  <Crown className="size-3.5 text-gold-300" strokeWidth={2} />
                )}
                {label}
                <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-text-tertiary">
                  {byStage[stage]?.length ?? 0}
                </span>
              </h3>
              <ul className="space-y-1.5">
                {byStage[stage]?.map((m) => {
                  const { home, away } = resolveMatch(
                    m,
                    groups,
                    knockouts,
                    thirdAssign,
                  );
                  const picked = knockouts[String(m.match_number)] ?? null;
                  return (
                    <KnockoutRow
                      key={m.match_number}
                      match={m}
                      homeId={home.team_id}
                      awayId={away.team_id}
                      homeIsThirdPool={home.is_third_place_pool}
                      awayIsThirdPool={away.is_third_place_pool}
                      homeThirdCandidates={home.third_place_candidate_groups}
                      awayThirdCandidates={away.third_place_candidate_groups}
                      pickedId={picked}
                      teamById={teamById}
                      groups={groups}
                      thirdAssign={thirdAssign}
                      canEdit={canEdit}
                      onPickWinner={(teamId) =>
                        pickKnockout(m.match_number, teamId)
                      }
                      onPickThirdPlace={pickThirdPlace}
                      locale={locale}
                    />
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Champion banner */}
      <ChampionBanner
        championId={championId}
        teamById={teamById}
        locale={locale}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Group ranker (4 rows, ↑ / ↓ buttons)                                      */
/* -------------------------------------------------------------------------- */

function GroupRanker({
  label,
  teams,
  allTeams,
  teamById,
  canEdit,
  onMove,
  locale,
}: {
  label: string;
  teams: string[];
  allTeams: TeamLite[];
  teamById: Map<string, TeamLite>;
  canEdit: boolean;
  onMove: (idx: number, direction: -1 | 1) => void;
  locale: Locale;
}) {
  // If the local state has no order yet, default to the discovered tournament
  // order (the order we extracted from the match schedule).
  const ordered =
    teams.length === 4
      ? teams.map((id) => teamById.get(id)).filter(Boolean) as TeamLite[]
      : allTeams;

  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.5] p-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-display text-sm font-bold text-text-primary">
          {locale === "fr" ? "Groupe" : "Group"} {label}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
          {locale === "fr" ? "1ᵉʳ → 4ᵉ" : "1st → 4th"}
        </span>
      </div>
      <ol className="space-y-1.5">
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Knockout row (two team slots + advance arrow)                              */
/* -------------------------------------------------------------------------- */

function KnockoutRow({
  match,
  homeId,
  awayId,
  homeIsThirdPool,
  awayIsThirdPool,
  homeThirdCandidates,
  awayThirdCandidates,
  pickedId,
  teamById,
  groups,
  thirdAssign,
  canEdit,
  onPickWinner,
  onPickThirdPlace,
  locale,
}: {
  match: KnockoutScheduleItem;
  homeId: string | null;
  awayId: string | null;
  homeIsThirdPool: boolean;
  awayIsThirdPool: boolean;
  homeThirdCandidates: string[];
  awayThirdCandidates: string[];
  pickedId: string | null;
  teamById: Map<string, TeamLite>;
  groups: GroupStandings;
  thirdAssign: Record<string, string>;
  canEdit: boolean;
  onPickWinner: (teamId: string) => void;
  onPickThirdPlace: (
    matchNumber: number,
    side: "home" | "away",
    teamId: string,
  ) => void;
  locale: Locale;
}) {
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[8px] border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
      <KnockoutSlot
        teamId={homeId}
        isThirdPool={homeIsThirdPool}
        candidateGroups={homeThirdCandidates}
        side="home"
        match={match}
        groups={groups}
        teamById={teamById}
        thirdAssign={thirdAssign}
        picked={pickedId === homeId && !!homeId}
        canEdit={canEdit}
        onPickWinner={onPickWinner}
        onPickThirdPlace={onPickThirdPlace}
        locale={locale}
      />
      <ChevronRight className="size-3 text-text-tertiary" strokeWidth={2} />
      <KnockoutSlot
        teamId={awayId}
        isThirdPool={awayIsThirdPool}
        candidateGroups={awayThirdCandidates}
        side="away"
        match={match}
        groups={groups}
        teamById={teamById}
        thirdAssign={thirdAssign}
        picked={pickedId === awayId && !!awayId}
        canEdit={canEdit}
        onPickWinner={onPickWinner}
        onPickThirdPlace={onPickThirdPlace}
        locale={locale}
        rightAligned
      />
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
  rightAligned = false,
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
  rightAligned?: boolean;
}) {
  const placeholder =
    side === "home" ? match.home_placeholder : match.away_placeholder;

  // Third-place pool slot that isn't assigned yet → render a tiny select.
  if (isThirdPool && !teamId) {
    const options = candidateGroups
      .map((g) => groups[g]?.[2] ?? null) // user's predicted 3rd of each group
      .filter((id): id is string => !!id)
      .map((id) => teamById.get(id))
      .filter((t): t is TeamLite => !!t);

    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-1 text-xs",
          rightAligned && "justify-end",
        )}
      >
        <select
          value={thirdAssign[`${match.match_number}-${side}`] ?? ""}
          onChange={(e) =>
            onPickThirdPlace(match.match_number, side, e.target.value)
          }
          disabled={!canEdit || options.length === 0}
          className="max-w-[7.5rem] rounded-[6px] border border-white/[0.08] bg-abyss/[0.5] px-1.5 py-1 text-[10px] text-text-secondary outline-none focus:border-violet-500/40 disabled:opacity-50"
        >
          <option value="">3{candidateGroups.join("")}</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {locale === "fr" ? t.name_fr : t.name_en}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Empty slot, upstream not yet resolved → show placeholder text.
  if (!teamId) {
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 text-xs text-text-tertiary",
          rightAligned && "justify-end",
        )}
      >
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
        canEdit
          ? locale === "fr"
            ? `Désigner ${name} vainqueur`
            : `Pick ${name} to advance`
          : undefined
      }
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-[6px] px-1.5 py-1 text-xs transition disabled:cursor-not-allowed",
        rightAligned && "flex-row-reverse justify-end text-right",
        picked
          ? "bg-primary-500/[0.16] font-bold text-primary-200 ring-1 ring-primary-500/40"
          : canEdit
            ? "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
            : "text-text-secondary",
      )}
    >
      <Flag isoCode={t.iso_code} size="sm" />
      <span className="truncate">{name}</span>
      {picked && (
        <CheckCircle2
          className="size-3 shrink-0 text-primary-300"
          strokeWidth={2.5}
        />
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Champion pill (sticky strip + bottom banner)                              */
/* -------------------------------------------------------------------------- */

function ChampionPill({
  championId,
  teamById,
  locale,
  saving,
}: {
  championId: string | null;
  teamById: Map<string, TeamLite>;
  locale: Locale;
  saving: boolean;
}) {
  const t = championId ? (teamById.get(championId) ?? null) : null;
  if (!t) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        <Crown className="size-3" strokeWidth={2} />
        {locale === "fr" ? "Champion ?" : "Champion ?"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/45 bg-gold-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-300 shadow-glow-gold">
      <Crown className="size-3" strokeWidth={2.5} />
      {locale === "fr" ? "Mon champion" : "My champion"}
      <Flag isoCode={t.iso_code} size="xs" />
      {locale === "fr" ? t.name_fr : t.name_en}
      {saving && <span className="ml-1 size-1 animate-pulse rounded-full bg-gold-300" />}
    </span>
  );
}

function ChampionBanner({
  championId,
  teamById,
  locale,
}: {
  championId: string | null;
  teamById: Map<string, TeamLite>;
  locale: Locale;
}) {
  if (!championId) return null;
  const t = teamById.get(championId);
  if (!t) return null;
  return (
    <section className="relative overflow-hidden rounded-[14px] border border-gold-500/40 bg-gradient-to-br from-gold-500/[0.18] via-primary-500/[0.05] to-transparent p-5 backdrop-blur-xl sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-gold-500/25 blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        <Crown className="size-10 text-gold-300" strokeWidth={1.5} />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
            {locale === "fr" ? "Ton scénario" : "Your scenario"}
          </div>
          <h3 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
            {locale === "fr"
              ? `${t.name_fr} soulève la Coupe`
              : `${t.name_en} lifts the Cup`}
          </h3>
        </div>
        <div className="ml-auto">
          <Flag isoCode={t.iso_code} size="2xl" />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function hydrateGroups(
  initial: Record<string, string[]>,
  groupTeams: Record<string, TeamLite[]>,
): GroupStandings {
  const out: GroupStandings = {};
  for (const [label, teams] of Object.entries(groupTeams)) {
    const fromServer = initial[label];
    if (fromServer && fromServer.length === 4) {
      // Make sure every server-saved id is still a valid team in the group.
      const valid = teams.map((t) => t.id);
      const filtered = fromServer.filter((id) => valid.includes(id));
      if (filtered.length === 4) {
        out[label] = filtered;
        continue;
      }
    }
    out[label] = teams.map((t) => t.id);
  }
  return out;
}

function pickChampion(
  finalMatch: BracketMatchInfo | undefined,
  knockouts: KnockoutWinners,
): string | null {
  if (!finalMatch) return null;
  return knockouts[String(finalMatch.match_number)] ?? null;
}

