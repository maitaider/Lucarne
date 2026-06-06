"use client";

import { useMemo, useState, useTransition } from "react";
import { Flag } from "@/components/team/flag";
import { BuyInBanner } from "@/components/paywall/buy-in-banner";
import { useToast } from "@/components/ui/toast-provider";
import {
  HowToCallout,
  type HowToStep,
} from "@/components/ui/how-to-callout";
import { LockCountdown } from "@/components/ui/lock-countdown";
import { Tooltip } from "@/components/ui/tooltip";
import {
  pruneOrphanedKnockoutPicks,
  resolveMatch,
  sanitizeThirdPlaceAssignments,
  type BracketMatchInfo,
  type GroupStandings,
  type KnockoutWinners,
} from "@/lib/predictions/resolve-bracket";
import {
  resetTournamentPrediction,
  upsertTournamentPrediction,
} from "@/lib/predictions/actions";
import type { TournamentPrediction } from "@/lib/predictions/queries";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Crown,
  ListOrdered,
  MousePointerClick,
  RotateCcw,
  Trash2,
  Trophy,
  X,
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
  const router = useRouter();
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

  /**
   * Sanitized view of `thirdAssign`: a team can occupy only one knockout slot,
   * so we drop stale / duplicate / invalid assignments before resolving. Every
   * render and downstream prune reads THIS, not the raw map (which may briefly
   * hold a now-invalid pick — e.g. right after a group reorder).
   */
  const cleanThird = useMemo(
    () => sanitizeThirdPlaceAssignments(thirdAssign, groups, knockoutSchedule),
    [thirdAssign, groups, knockoutSchedule],
  );

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
    // Reordering can move a team out of (or into) 3rd place — re-sanitize the
    // third-place picks against the new standings so none linger as duplicates.
    const nextAssign = sanitizeThirdPlaceAssignments(
      thirdAssign,
      nextGroups,
      knockoutSchedule,
    );
    const pruned = pruneOrphanedKnockoutPicks(
      knockoutSchedule,
      nextGroups,
      knockouts,
      nextAssign,
    );
    setGroups(nextGroups);
    setThirdAssign(nextAssign);
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
      cleanThird,
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
    // Start from the sanitized map so we never build on a stale/duplicate base.
    const nextAssign: Record<string, string> = { ...cleanThird };
    if (!teamId) {
      delete nextAssign[key];
    } else {
      // A team can occupy only one slot: drop it from any other slot first.
      for (const k of Object.keys(nextAssign)) {
        if (nextAssign[k] === teamId) delete nextAssign[k];
      }
      nextAssign[key] = teamId;
    }
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

  // Pre-compute match_numbers per stage so the reset action knows what
  // to wipe.
  const stageMatchNumbers = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const m of knockoutSchedule) {
      (out[m.stage] ??= []).push(m.match_number);
    }
    return out;
  }, [knockoutSchedule]);

  function reset(
    scope:
      | "all"
      | "groups"
      | "r32"
      | "r16"
      | "qf"
      | "sf"
      | "third_place"
      | "final",
  ) {
    if (!canEdit) return;
    startTransition(async () => {
      const res = await resetTournamentPrediction({
        scope,
        group_standings: groups,
        knockout_winners: knockouts,
        stage_match_numbers: stageMatchNumbers,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      // Apply locally so the UI updates immediately.
      if (scope === "all" || scope === "groups") {
        setGroups(hydrateGroups({}, groupTeams));
        setKnockouts({});
        setThirdAssign({});
      } else {
        const order = ["r32", "r16", "qf", "sf", "third_place", "final"];
        const idx = order.indexOf(scope);
        const toClear = order.slice(idx);
        const nextK = { ...knockouts };
        const nextAssign = { ...thirdAssign };
        for (const stage of toClear) {
          for (const n of stageMatchNumbers[stage] ?? []) {
            delete nextK[String(n)];
            delete nextAssign[`${n}-home`];
            delete nextAssign[`${n}-away`];
          }
        }
        setKnockouts(nextK);
        setThirdAssign(nextAssign);
      }
      toast.success(
        locale === "fr" ? "Réinitialisé" : "Reset done",
      );
      router.refresh();
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

  // 3-step explainer shown on first visit, dismissable.
  const howToSteps: HowToStep[] =
    locale === "fr"
      ? [
          {
            icon: ListOrdered,
            title: "1. Classe chaque groupe",
            body: "Utilise les flèches ↑↓ sur les 12 cartes du dessous pour ranger les 4 équipes de chaque groupe de la 1ʳᵉ à la 4ᵉ place.",
          },
          {
            icon: MousePointerClick,
            title: "2. Fais avancer tes vainqueurs",
            body: "Dans chaque tie de la phase finale, clique sur l'équipe que tu vois passer. Elle s'illumine en vert et avance d'un tour automatiquement.",
          },
          {
            icon: Crown,
            title: "3. Couronne ton champion",
            body: "Ta finale donne automatiquement ton champion (banderole dorée en bas). Tout se sauvegarde tout seul, modifiable jusqu'au verrou.",
          },
        ]
      : [
          {
            icon: ListOrdered,
            title: "1. Rank every group",
            body: "Use the ↑↓ arrows on the 12 cards below to order the 4 teams in each group from 1st to 4th.",
          },
          {
            icon: MousePointerClick,
            title: "2. Advance your winners",
            body: "In each knockout tie, click the team you think wins. It turns green and moves to the next round automatically.",
          },
          {
            icon: Crown,
            title: "3. Crown your champion",
            body: "Your final pick crowns your champion (gold banner at the bottom). Auto-saved, editable until the global lock.",
          },
        ];

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

      <HowToCallout
        storageKey="howto:bracket:v1"
        title={locale === "fr" ? "Comment ça marche" : "How it works"}
        subtitle={
          locale === "fr"
            ? "Bâtis tout ton scénario du Mondial en 3 minutes. Verrouillé une seule fois au coup d'envoi du 1ᵉʳ match."
            : "Build your whole World Cup scenario in 3 minutes. Locked once at the very first kickoff."
        }
        steps={howToSteps}
        accent="gold"
        showAgainLabel={
          locale === "fr" ? "Revoir l'aide scénario" : "Show scenario help"
        }
      />

      {/* Sticky progress strip */}
      <section className="sticky top-[64px] z-30 rounded-md border border-white/[0.1] bg-abyss/[0.85] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-sm border border-gold-500/35 bg-gold-500/[0.1] text-gold-300">
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

          <div className="flex items-center gap-2">
            <LockCountdown targetAt={deadlineAt} locale={locale} />
            <ChampionPill
              championId={championId}
              teamById={teamById}
              locale={locale}
              saving={isPending}
            />
          </div>
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
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              1.
            </span>
            {locale === "fr" ? "Classe les groupes" : "Rank the groups"}
          </h2>
          <div className="flex items-center gap-2">
            <p className="hidden text-[11px] text-text-tertiary sm:block">
              {locale === "fr"
                ? "Flèches ↑↓ pour réordonner."
                : "Use ↑↓ to reorder."}
            </p>
            <ResetButton
              disabled={!canEdit || groupsFilledCount === 0}
              onClick={() => reset("groups")}
              locale={locale}
              size="sm"
            />
          </div>
        </div>
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
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              2.
            </span>
            {locale === "fr" ? "Phase finale" : "Knockouts"}
          </h2>
          <p className="hidden text-[11px] text-text-tertiary sm:block">
            {locale === "fr"
              ? "Clique l'équipe que tu vois passer. Changer une équipe au début refait la suite automatiquement."
              : "Click the team you think wins. Changing an early pick re-runs the rest automatically."}
          </p>
        </div>

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
          ).map(([stage, label]) => {
            const stageMatches = byStage[stage] ?? [];
            const stagePicked = stageMatches.filter(
              (m) => knockouts[String(m.match_number)],
            ).length;
            return (
            <article
              key={stage}
              className={cn(
                "rounded-md border border-white/[0.08] bg-surface-1/[0.6] p-4 backdrop-blur-xl",
                stage === "final" && "border-gold-500/40 bg-gold-500/[0.06]",
              )}
            >
              <h3 className="mb-3 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-text-tertiary">
                <span className="flex items-center gap-2">
                  {stage === "final" && (
                    <Crown className="size-3.5 text-gold-300" strokeWidth={2} />
                  )}
                  {label}
                  <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-text-tertiary">
                    {stagePicked}/{stageMatches.length}
                  </span>
                </span>
                <ResetButton
                  disabled={!canEdit || stagePicked === 0}
                  onClick={() => reset(stage)}
                  locale={locale}
                  size="xs"
                />
              </h3>
              <ul className="space-y-1.5">
                {byStage[stage]?.map((m) => {
                  const { home, away } = resolveMatch(
                    m,
                    groups,
                    knockouts,
                    cleanThird,
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
                      thirdAssign={cleanThird}
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
            );
          })}
        </div>
      </section>

      {/* Champion banner */}
      <ChampionBanner
        championId={championId}
        teamById={teamById}
        locale={locale}
      />

      {/* Danger zone — full reset */}
      {canEdit && (groupsFilledCount > 0 || knockoutPickedCount > 0) && (
        <section className="mt-6 flex flex-col items-center gap-2 rounded-md border border-error/25 bg-error/[0.04] p-4 text-center backdrop-blur-xl sm:flex-row sm:justify-between sm:text-left">
          <div>
            <div className="font-display text-sm font-semibold text-text-primary">
              {locale === "fr"
                ? "Tout effacer et repartir de zéro"
                : "Wipe everything and start over"}
            </div>
            <p className="mt-0.5 text-xs leading-5 text-text-tertiary">
              {locale === "fr"
                ? "Efface tous tes pronostics (groupes + phase finale + champion). Tu pourras reconstruire à partir de zéro."
                : "Clears every pick (groups + knockouts + champion). You'll be able to start fresh."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  locale === "fr"
                    ? "Effacer tout ton scénario ? Action irréversible."
                    : "Wipe your entire scenario? This can't be undone.",
                )
              )
                reset("all");
            }}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-sm border border-error/40 bg-error/[0.1] px-4 py-2 text-xs font-bold uppercase tracking-wider text-error transition hover:bg-error/[0.18] disabled:opacity-50"
          >
            <Trash2 className="size-3.5" strokeWidth={2.5} />
            {locale === "fr" ? "Tout effacer" : "Wipe all"}
          </button>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reset button (mini)                                                       */
/* -------------------------------------------------------------------------- */
function ResetButton({
  onClick,
  disabled,
  locale,
  size = "sm",
}: {
  onClick: () => void;
  disabled: boolean;
  locale: Locale;
  size?: "xs" | "sm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={locale === "fr" ? "Réinitialiser cette section" : "Reset this section"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] font-bold uppercase tracking-wider text-text-tertiary transition hover:border-error/40 hover:bg-error/[0.1] hover:text-error disabled:cursor-not-allowed disabled:opacity-30",
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
      )}
    >
      <RotateCcw
        className={size === "xs" ? "size-2.5" : "size-3"}
        strokeWidth={2.5}
      />
      {locale === "fr" ? "Réinit" : "Reset"}
    </button>
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
              "grid grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xs border px-2 py-1.5 text-xs transition",
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
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-sm border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
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
    const thisKey = `${match.match_number}-${side}`;
    // A 3rd-placed team can fill only one slot — hide teams already taken by
    // another third-place slot (candidate groups overlap, so the same team is
    // otherwise offered in several dropdowns).
    const usedElsewhere = new Set(
      Object.entries(thirdAssign)
        .filter(([k]) => k !== thisKey)
        .map(([, v]) => v),
    );
    const options = candidateGroups
      .map((g) => groups[g]?.[2] ?? null) // user's predicted 3rd of each group
      .filter((id): id is string => !!id)
      .filter((id) => !usedElsewhere.has(id))
      .map((id) => teamById.get(id))
      .filter((t): t is TeamLite => !!t);

    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-1 text-xs",
          rightAligned && "justify-end",
        )}
      >
        <Tooltip
          content={
            locale === "fr"
              ? `Ce slot reçoit le 3ᵉ d'un des groupes ${candidateGroups.join(", ")}. Choisis lequel de tes 3ᵉ tu y mets.`
              : `This slot takes one of the 3rd-placed teams from groups ${candidateGroups.join(", ")}. Pick which of your 3rds fills it.`
          }
        >
          <select
            value={thirdAssign[`${match.match_number}-${side}`] ?? ""}
            onChange={(e) =>
              onPickThirdPlace(match.match_number, side, e.target.value)
            }
            disabled={!canEdit || options.length === 0}
            className="max-w-[7.5rem] rounded-xs border border-violet-500/30 bg-abyss/[0.5] px-1.5 py-1 text-[10px] text-text-secondary outline-none focus:border-violet-500/50 disabled:opacity-50"
          >
            <option value="">
              {locale === "fr" ? `3ᵉ ${candidateGroups.join("/")}` : `3rd ${candidateGroups.join("/")}`}
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

  const teamButton = (
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
        "flex min-w-0 items-center gap-2 rounded-xs px-1.5 py-1 text-xs transition disabled:cursor-not-allowed",
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

  // A filled third-place slot stays editable: a small ✕ next to the team
  // clears the pick and reopens the dropdown (and prunes any downstream
  // winner that relied on this team). Direct qualifiers have no ✕.
  if (isThirdPool && canEdit) {
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-1",
          rightAligned && "flex-row-reverse justify-end",
        )}
      >
        {teamButton}
        <Tooltip
          content={
            locale === "fr"
              ? "Changer / retirer ce 3ᵉ"
              : "Change / remove this 3rd"
          }
        >
          <button
            type="button"
            onClick={() => onPickThirdPlace(match.match_number, side, "")}
            aria-label={
              locale === "fr"
                ? "Retirer le 3ᵉ sélectionné"
                : "Remove selected 3rd"
            }
            className="shrink-0 rounded-xs p-0.5 text-text-tertiary transition hover:bg-white/[0.06] hover:text-red-300"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </Tooltip>
      </div>
    );
  }

  return teamButton;
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

