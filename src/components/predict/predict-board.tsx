"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Flag } from "@/components/team/flag";
import { BuyInBanner } from "@/components/paywall/buy-in-banner";
import {
  HowToCallout,
  type HowToStep,
} from "@/components/ui/how-to-callout";
import { LockCountdown } from "@/components/ui/lock-countdown";
import { useToast } from "@/components/ui/toast-provider";
import { Segmented } from "@/components/ui/segmented";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  pruneOrphanedKnockoutPicks,
  sanitizeThirdPlaceAssignments,
  type BracketMatchInfo,
  type GroupStandings,
  type KnockoutWinners,
} from "@/lib/predictions/resolve-bracket";
import {
  clearMyMatchPredictions,
  resetTournamentPrediction,
  upsertTournamentPrediction,
} from "@/lib/predictions/actions";
import { computeGroupOrder } from "@/lib/predictions/group-order";
import type { TournamentPrediction } from "@/lib/predictions/queries";
import { placeBet } from "@/lib/bets/place-bet";
import { GroupCard } from "./group-card";
import { KnockoutTie } from "./knockout-tie";
import { ChampionBanner } from "./champion-banner";
import type { MatchListItem } from "@/lib/matches/shared";
import {
  CircleDashed,
  Crown,
  ListChecks,
  ListOrdered,
  MousePointerClick,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export type Winner = "home" | "draw" | "away";

/** Per-match pick: a scoreline (home/away goals). The match result (win/draw)
 *  and the total goals derive from the score. */
export type MatchPick = {
  home_goals: number | null;
  away_goals: number | null;
};

type InitialPicks = Record<
  string,
  { bet_type: string; payload: unknown; status: string }[]
>;

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

type Tab = "groupes" | "finale";

function emptyMatchPick(): MatchPick {
  return { home_goals: null, away_goals: null };
}

/* ----------------------------------------------------------------------------
 *  Draft model — explicit "Confirm" per match.
 *
 *  `matchPicks` holds only CONFIRMED picks (hydrated from the saved bets).
 *  `draftPicks` is a local scratchpad of in-progress edits. The user types a
 *  score into the draft; nothing is persisted until they click "Confirmer le
 *  pronostic", which fires the existing placeBet flow.
 *
 *  DECISION (documented): the live group standings strip AND the persisted
 *  bracket both derive ONLY from CONFIRMED picks — a draft never re-ranks a
 *  group. So "what the standings show" === "what is saved" === "what seeds the
 *  bracket", with no divergence and no jump-back on reload. The confirm click
 *  is the single moment a score becomes an `exact_score` bet AND re-ranks its
 *  group → re-seeds the bracket (computeGroupOrder → upsertTournamentPrediction),
 *  exactly as the old auto-save did — only the timing moves to the explicit click.
 * -------------------------------------------------------------------------- */

function picksEqual(a: MatchPick, b: MatchPick): boolean {
  return a.home_goals === b.home_goals && a.away_goals === b.away_goals;
}

/** A pick has content once it carries a complete scoreline. */
function pickHasContent(p: MatchPick): boolean {
  return p.home_goals != null && p.away_goals != null;
}

export type MatchDraftStatus = {
  /** The value to display: the draft if any, else the confirmed pick. */
  effective: MatchPick;
  /** Draft exists and differs from the confirmed pick → enable "Confirmer". */
  dirty: boolean;
  /** A confirmed score exists → show "✓ Confirmé". */
  confirmed: boolean;
};

/** Per-match draft status, derived from the confirmed + draft maps. */
export function matchDraftStatus(
  matchId: string,
  matchPicks: Map<string, MatchPick>,
  draftPicks: Map<string, MatchPick>,
): MatchDraftStatus {
  const saved = matchPicks.get(matchId) ?? emptyMatchPick();
  const draft = draftPicks.get(matchId);
  return {
    effective: draft ?? saved,
    dirty: draft != null && !picksEqual(draft, saved),
    confirmed: pickHasContent(saved),
  };
}

/** Stage a per-match edit into the local draft. */
export type EditDraftFn = (
  matchId: string,
  update: (prev: MatchPick) => MatchPick,
) => void;
/** Commit a match's draft (the only thing that persists). */
export type ConfirmMatchFn = (matchId: string) => void;

function hydrateMatchPicks(initial: InitialPicks): Map<string, MatchPick> {
  const out = new Map<string, MatchPick>();
  for (const [matchId, rows] of Object.entries(initial)) {
    const state = emptyMatchPick();
    for (const r of rows) {
      if (r.status !== "validated") continue;
      const payload = (r.payload ?? {}) as Record<string, unknown>;
      if (
        r.bet_type === "exact_score" &&
        typeof payload.home === "number" &&
        typeof payload.away === "number"
      ) {
        state.home_goals = payload.home;
        state.away_goals = payload.away;
      }
    }
    out.set(matchId, state);
  }
  return out;
}

function hydrateGroups(
  initial: Record<string, string[]>,
  groupTeams: Record<string, TeamLite[]>,
): GroupStandings {
  const out: GroupStandings = {};
  for (const [label, teams] of Object.entries(groupTeams)) {
    const fromServer = initial[label];
    if (fromServer && fromServer.length === 4) {
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

export function PredictBoard({
  initialTab,
  groupTeams,
  groupMatches,
  knockoutSchedule,
  initialPrediction,
  initialPicks,
  canEdit,
  canBet,
  buyInAmountCents,
  currency,
  deadlineAt,
  deadlinePassed,
  locale,
}: {
  initialTab: Tab;
  groupTeams: Record<string, TeamLite[]>;
  groupMatches: MatchListItem[];
  knockoutSchedule: KnockoutScheduleItem[];
  initialPrediction: TournamentPrediction;
  initialPicks: InitialPicks;
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
  const [tab, setTab] = useState<Tab>(initialTab);
  const [, startTransition] = useTransition();

  // ---- Bracket state (groups + knockout winners) -----------------------------
  const [groups, setGroups] = useState<GroupStandings>(() =>
    hydrateGroups(initialPrediction.group_standings, groupTeams),
  );
  const [knockouts, setKnockouts] = useState<KnockoutWinners>(() => ({
    ...initialPrediction.knockout_winners,
  }));
  const [thirdAssign, setThirdAssign] = useState<Record<string, string>>({});

  // A team can occupy only ONE knockout slot. `thirdAssign` is a loose map the
  // user fills via dropdowns; sanitize it before resolving so a 3rd-placed team
  // never lands in two overlapping pool slots, and never lingers after being
  // reordered out of 3rd. Everything (rendering + prune) reads THIS.
  const cleanThird = useMemo(
    () => sanitizeThirdPlaceAssignments(thirdAssign, groups, knockoutSchedule),
    [thirdAssign, groups, knockoutSchedule],
  );

  // ---- Per-match state (score) -----------------------------------------------
  // `matchPicks` = CONFIRMED picks only (feeds standings + bracket).
  const [matchPicks, setMatchPicks] = useState<Map<string, MatchPick>>(() =>
    hydrateMatchPicks(initialPicks),
  );
  // `draftPicks` = local, unsaved edits awaiting an explicit "Confirmer" click.
  const [draftPicks, setDraftPicks] = useState<Map<string, MatchPick>>(
    () => new Map(),
  );
  // Match ids whose confirm is currently in flight (for the spinner / disable).
  const [pendingMatchIds, setPendingMatchIds] = useState<Set<string>>(
    () => new Set(),
  );

  const teamById = useMemo(() => {
    const map = new Map<string, TeamLite>();
    for (const arr of Object.values(groupTeams))
      for (const t of arr) map.set(t.id, t);
    return map;
  }, [groupTeams]);

  // Group matches grouped by group_label.
  const matchesByGroup = useMemo(() => {
    const out: Record<string, MatchListItem[]> = {};
    for (const m of groupMatches) {
      if (!m.group_label) continue;
      (out[m.group_label] ??= []).push(m);
    }
    for (const arr of Object.values(out)) {
      arr.sort((a, b) => {
        const an = a.match_number ?? 999;
        const bn = b.match_number ?? 999;
        return an - bn;
      });
    }
    return out;
  }, [groupMatches]);

  // Knockouts grouped by stage.
  const byStage = useMemo(() => {
    const out: Record<string, KnockoutScheduleItem[]> = {};
    for (const m of knockoutSchedule) (out[m.stage] ??= []).push(m);
    for (const arr of Object.values(out))
      arr.sort((a, b) => a.match_number - b.match_number);
    return out;
  }, [knockoutSchedule]);

  // Stage match_numbers for the reset action.
  const stageMatchNumbers = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const m of knockoutSchedule)
      (out[m.stage] ??= []).push(m.match_number);
    return out;
  }, [knockoutSchedule]);

  const finalMatch = useMemo(
    () => knockoutSchedule.find((m) => m.stage === "final"),
    [knockoutSchedule],
  );
  const championId = finalMatch
    ? (knockouts[String(finalMatch.match_number)] ?? null)
    : null;

  // ---- Save helpers ----------------------------------------------------------

  function saveBracket(next: {
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
      if (!res.ok) toast.error(res.message);
    });
  }

  function commitGroupOrder(group: string, next: string[]) {
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
    saveBracket({
      groups: nextGroups,
      knockouts: pruned,
      championId: finalMatch
        ? (pruned[String(finalMatch.match_number)] ?? null)
        : null,
    });
  }

  function pickKnockoutWinner(matchNumber: number, teamId: string) {
    if (!canEdit) return;
    const key = String(matchNumber);
    const next = { ...knockouts };
    if (next[key] === teamId) {
      // Re-tapping the chosen team cancels the selection.
      delete next[key];
    } else {
      next[key] = teamId;
    }
    const pruned = pruneOrphanedKnockoutPicks(
      knockoutSchedule,
      groups,
      next,
      cleanThird,
    );
    setKnockouts(pruned);
    saveBracket({
      groups,
      knockouts: pruned,
      championId: finalMatch
        ? (pruned[String(finalMatch.match_number)] ?? null)
        : null,
    });
  }

  function pickThirdPlace(
    matchNumber: number,
    side: "home" | "away",
    teamId: string,
  ) {
    if (!canEdit) return;
    const key = `${matchNumber}-${side}`;
    // Start from the sanitized map so we never build on a stale/duplicate base.
    const nextAssign: Record<string, string> = { ...cleanThird };
    if (!teamId) {
      // Empty value = clear this slot (the ✕ / the dropdown's blank option).
      delete nextAssign[key];
    } else {
      // A team can occupy only one slot: drop it from any other slot first.
      for (const k of Object.keys(nextAssign)) {
        if (nextAssign[k] === teamId) delete nextAssign[k];
      }
      nextAssign[key] = teamId;
    }
    setThirdAssign(nextAssign);
    const pruned = pruneOrphanedKnockoutPicks(
      knockoutSchedule,
      groups,
      knockouts,
      nextAssign,
    );
    setKnockouts(pruned);
    saveBracket({
      groups,
      knockouts: pruned,
      championId: finalMatch
        ? (pruned[String(finalMatch.match_number)] ?? null)
        : null,
    });
  }

  // ---- Per-match draft + confirm (score) -------------------------------------

  /** Stage a per-match edit into the LOCAL draft. Nothing persists here. */
  function editDraft(matchId: string, update: (prev: MatchPick) => MatchPick) {
    if (!canBet) {
      router.push("/buy-in");
      return;
    }
    const base =
      draftPicks.get(matchId) ?? matchPicks.get(matchId) ?? emptyMatchPick();
    const after = update(base);
    setDraftPicks((prev) => {
      const next = new Map(prev);
      next.set(matchId, after);
      return next;
    });
  }

  /** Commit a match's draft via placeBet — the ONLY thing that persists. On
   *  success the draft becomes a confirmed pick and, for a group score, the
   *  group is re-ranked → bracket re-seeded (same logic the auto-save used). */
  function confirmMatch(matchId: string) {
    if (!canBet) {
      router.push("/buy-in");
      return;
    }
    const saved = matchPicks.get(matchId) ?? emptyMatchPick();
    const draft = draftPicks.get(matchId);
    if (!draft || picksEqual(draft, saved)) return;
    if (draft.home_goals == null || draft.away_goals == null) return; // need a full score

    setPendingMatchIds((prev) => new Set(prev).add(matchId));
    startTransition(async () => {
      const res = await placeBet({
        match_id: matchId,
        league_id: null,
        bet: {
          bet_type: "exact_score",
          match_id: matchId,
          payload: { home: draft.home_goals, away: draft.away_goals },
        } as never,
        stake_cents: 0,
        client_request_id: crypto.randomUUID(),
      });
      if (!res.ok) {
        toast.error(res.message);
        setPendingMatchIds((prev) => {
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
        return; // keep the draft intact so the user can retry
      }

      // Persisted OK → promote the draft to a confirmed pick, drop the draft.
      const nextPicks = new Map(matchPicks);
      nextPicks.set(matchId, draft);
      setMatchPicks(nextPicks);
      setDraftPicks((prev) => {
        const next = new Map(prev);
        next.delete(matchId);
        return next;
      });
      setPendingMatchIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });

      // A confirmed group score re-ranks that group → re-seeds the bracket.
      const gm = groupMatches.find((m) => m.id === matchId);
      if (gm?.group_label) {
        const label = gm.group_label;
        const ids = (groupTeams[label] ?? []).map((t) => t.id);
        const { order } = computeGroupOrder(
          (matchesByGroup[label] ?? []).map((m) => {
            const p = nextPicks.get(m.id);
            return {
              home_team_id: m.home_team?.id ?? null,
              away_team_id: m.away_team?.id ?? null,
              home_goals: p?.home_goals ?? null,
              away_goals: p?.away_goals ?? null,
            };
          }),
          ids,
          groups[label] ?? ids,
        );
        commitGroupOrder(label, order);
      }

      toast.success(
        locale === "fr" ? "Pronostic confirmé" : "Prediction confirmed",
      );
    });
  }

  // ---- Reset -----------------------------------------------------------------

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
      if (scope === "all" || scope === "groups") {
        // Score-only: the per-match scores ARE the prediction (and drive the
        // group standings), so wipe those bets too — clearing only the bracket
        // let the standings recompute from the still-saved scores, so the
        // button read as a no-op ("toutes les pronos sont encore là").
        const cleared = await clearMyMatchPredictions();
        if (!cleared.ok) {
          toast.error(cleared.message);
          router.refresh(); // resync — the bracket was already cleared server-side
          return;
        }
        setGroups(hydrateGroups({}, groupTeams));
        setKnockouts({});
        setThirdAssign({});
        setMatchPicks(new Map());
        setDraftPicks(new Map());
        setPendingMatchIds(new Set());
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
      toast.success(locale === "fr" ? "Réinitialisé" : "Reset done");
      router.refresh();
    });
  }

  // ---- Counters --------------------------------------------------------------

  const groupsFilledCount = Object.values(groups).filter(
    (g) => g.length === 4,
  ).length;
  const knockoutPickedCount = Object.keys(knockouts).length;
  const totalKnockouts = knockoutSchedule.length;
  const matchWinnersCount = Array.from(matchPicks.values()).filter(
    (p) => p.home_goals != null && p.away_goals != null,
  ).length;
  const totalMatches = groupMatches.length + knockoutSchedule.length;
  const groupWinnersCount = groupMatches.filter((m) => {
    const p = matchPicks.get(m.id);
    return p?.home_goals != null && p?.away_goals != null;
  }).length;

  // Per-match drafts the user has typed but not yet confirmed.
  const unconfirmedCount = useMemo(() => {
    let n = 0;
    for (const id of draftPicks.keys()) {
      if (matchDraftStatus(id, matchPicks, draftPicks).dirty) n++;
    }
    return n;
  }, [draftPicks, matchPicks]);

  // ---- HowTo steps -----------------------------------------------------------

  const howToSteps: HowToStep[] =
    locale === "fr"
      ? [
          {
            icon: ListOrdered,
            title: "Phase de groupes",
            body: "Pronostique le score de chacun des 6 matchs par groupe, puis clique « Confirmer le pronostic » pour l'enregistrer. Le classement se recalcule depuis tes matchs confirmés.",
          },
          {
            icon: MousePointerClick,
            title: "Phase finale",
            body: "L'arbre se remplit auto à partir de tes groupes. Clique le vainqueur de chaque tie pour avancer + déploie +Plus pour les détails.",
          },
          {
            icon: Crown,
            title: "Ton champion",
            body: "Le vainqueur de ta finale devient automatiquement ton champion. Tout est modifiable jusqu'au verrou.",
          },
        ]
      : [
          {
            icon: ListOrdered,
            title: "Group phase",
            body: "Predict the score of every group match, then click “Confirm prediction” to save it. The standings recompute from your confirmed matches.",
          },
          {
            icon: MousePointerClick,
            title: "Knockouts",
            body: "The bracket fills from your group picks. Click each tie's winner to advance + expand +More for details.",
          },
          {
            icon: Crown,
            title: "Your champion",
            body: "Your final pick crowns your champion. Everything is editable until the lock.",
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
        storageKey="howto:predict:v1"
        title={locale === "fr" ? "Comment ça marche" : "How it works"}
        subtitle={
          locale === "fr"
            ? "Deux segments : pronostique chaque match puis confirme ton pronostic (gauche), puis bâtis ta phase finale (droite). Rien n'est enregistré tant que tu n'as pas confirmé. Verrouillé une seule fois au coup d'envoi du 1ᵉʳ match."
            : "Two segments: predict each match then confirm your prediction (left), then build your bracket (right). Nothing is saved until you confirm. Locked once at the very first kickoff."
        }
        steps={howToSteps}
        accent="gold"
        showAgainLabel={
          locale === "fr" ? "Revoir l'aide pronos" : "Show predict help"
        }
      />

      {/* Sticky control strip: segment switcher + progress + countdown */}
      <section className="sticky top-[64px] z-30 rounded-md border border-border-strong/50 bg-abyss/90 p-3 shadow-raised backdrop-blur-md sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            items={[
              {
                key: "groupes",
                label: locale === "fr" ? "Groupes" : "Groups",
                icon: ListOrdered,
                badge: `${groupWinnersCount}/${groupMatches.length}`,
              },
              {
                key: "finale",
                label: locale === "fr" ? "Phase finale" : "Knockouts",
                icon: Trophy,
                badge: `${knockoutPickedCount}/${totalKnockouts}`,
              },
            ]}
            value={tab}
            onChange={(t) => {
              setTab(t);
              const url = new URL(window.location.href);
              url.searchParams.set("tab", t);
              window.history.replaceState({}, "", url.toString());
            }}
          />

          <div className="flex items-center gap-2">
            {unconfirmedCount > 0 && (
              <span
                title={
                  locale === "fr"
                    ? "Des pronos sont en brouillon — clique « Confirmer » sur chaque match."
                    : "Some picks are drafts — click “Confirm” on each match."
                }
              >
                <Badge tone="gold" icon={CircleDashed}>
                  {unconfirmedCount}{" "}
                  {locale === "fr" ? "à confirmer" : "to confirm"}
                </Badge>
              </span>
            )}
            <LockCountdown targetAt={deadlineAt} locale={locale} />
            <ChampionPill
              championId={championId}
              teamById={teamById}
              locale={locale}
            />
          </div>
        </div>

        <ProgressBar
          className="mt-3"
          value={matchWinnersCount + knockoutPickedCount}
          max={totalMatches}
          accent="primary"
          label={
            locale === "fr"
              ? "Progression de ton pronostic"
              : "Prediction progress"
          }
        />
      </section>

      {/* Segment body */}
      {tab === "groupes" ? (
        <GroupesSection
          groupTeams={groupTeams}
          matchesByGroup={matchesByGroup}
          groups={groups}
          matchPicks={matchPicks}
          draftPicks={draftPicks}
          pendingMatchIds={pendingMatchIds}
          teamById={teamById}
          canEdit={canEdit}
          canBet={canBet}
          onEditDraft={editDraft}
          onConfirmMatch={confirmMatch}
          locale={locale}
        />
      ) : (
        <FinaleSection
          byStage={byStage}
          knockouts={knockouts}
          groups={groups}
          thirdAssign={cleanThird}
          teamById={teamById}
          canEdit={canEdit}
          onPickWinner={pickKnockoutWinner}
          onPickThirdPlace={pickThirdPlace}
          onResetStage={reset}
          locale={locale}
        />
      )}

      <ChampionBanner
        championId={championId}
        teamById={teamById}
        locale={locale}
      />

      {/* Global reset (danger) */}
      {canEdit &&
        (groupsFilledCount > 0 ||
          knockoutPickedCount > 0 ||
          matchWinnersCount > 0) && (
          <Card className="mt-2 border-error/30" padded="md">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <div className="font-display text-sm font-semibold text-text-primary">
                  {locale === "fr"
                    ? "Tout effacer mon pronostic"
                    : "Wipe my whole prediction"}
                </div>
                <p className="mt-0.5 text-xs leading-5 text-text-tertiary">
                  {locale === "fr"
                    ? "Efface tout : les scores de chaque match (encore modifiables), le classement des groupes, la phase finale et ton champion. Les matchs déjà commencés ou terminés sont conservés. Irréversible."
                    : "Wipes everything: every match score (still editable), the group standings, the knockouts and your champion. Matches already started or finished are kept. This can't be undone."}
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => {
                  if (
                    confirm(
                      locale === "fr"
                        ? "Effacer toute la prédiction tournoi ? Irréversible."
                        : "Wipe the whole tournament prediction? This can't be undone.",
                    )
                  )
                    reset("all");
                }}
              >
                {locale === "fr" ? "Tout effacer" : "Wipe all"}
              </Button>
            </div>
          </Card>
        )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Champion pill                                                             */
/* -------------------------------------------------------------------------- */

function ChampionPill({
  championId,
  teamById,
  locale,
}: {
  championId: string | null;
  teamById: Map<string, TeamLite>;
  locale: Locale;
}) {
  const t = championId ? teamById.get(championId) : null;
  if (!t) {
    return (
      <Badge tone="outline" icon={Crown}>
        {locale === "fr" ? "Champion ?" : "Champion ?"}
      </Badge>
    );
  }
  return (
    <Badge tone="gold" className="shadow-glow-gold">
      <Crown className="size-3" strokeWidth={2.5} />
      <Flag isoCode={t.iso_code} size="xs" />
      {locale === "fr" ? t.name_fr : t.name_en}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*  Groupes section                                                           */
/* -------------------------------------------------------------------------- */

function GroupesSection({
  groupTeams,
  matchesByGroup,
  groups,
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
  groupTeams: Record<string, TeamLite[]>;
  matchesByGroup: Record<string, MatchListItem[]>;
  groups: GroupStandings;
  matchPicks: Map<string, MatchPick>;
  draftPicks: Map<string, MatchPick>;
  pendingMatchIds: Set<string>;
  teamById: Map<string, TeamLite>;
  canEdit: boolean;
  canBet: boolean;
  onEditDraft: EditDraftFn;
  onConfirmMatch: ConfirmMatchFn;
  locale: Locale;
}) {
  const labels = Object.keys(groupTeams).sort();
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
          <Sparkles className="size-4 text-primary-400" strokeWidth={1.7} />
          {locale === "fr" ? "Phase de groupes" : "Group phase"}
        </h2>
      </div>
      <Card
        padded="sm"
        className="mb-3 border-primary-500/20 bg-primary-500/[0.05]"
      >
        <p className="flex items-start gap-2.5 text-xs leading-5 text-text-secondary">
          <ListChecks
            className="mt-0.5 size-4 shrink-0 text-primary-400"
            strokeWidth={2}
          />
          <span>
            {locale === "fr"
              ? "Pronostique le score de chacun des 6 matchs, puis clique « Confirmer le pronostic » pour l'enregistrer. Le classement se recalcule depuis tes matchs confirmés : les 2 premiers se qualifient, le 3ᵉ joue le repêchage. Rien n'est enregistré tant que tu n'as pas confirmé."
              : "Predict the score of each of the 6 group matches, then click “Confirm prediction” to save it. The standings recompute from your confirmed matches: top 2 qualify, 3rd goes to the playoff. Nothing is saved until you confirm."}
          </span>
        </p>
      </Card>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {labels.map((label) => (
          <GroupCard
            key={label}
            label={label}
            teams={groups[label] ?? []}
            allTeams={groupTeams[label] ?? []}
            matches={matchesByGroup[label] ?? []}
            matchPicks={matchPicks}
            draftPicks={draftPicks}
            pendingMatchIds={pendingMatchIds}
            teamById={teamById}
            canEdit={canEdit}
            canBet={canBet}
            onEditDraft={onEditDraft}
            onConfirmMatch={onConfirmMatch}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Phase finale section                                                      */
/* -------------------------------------------------------------------------- */

function FinaleSection({
  byStage,
  knockouts,
  groups,
  thirdAssign,
  teamById,
  canEdit,
  onPickWinner,
  onPickThirdPlace,
  onResetStage,
  locale,
}: {
  byStage: Record<string, KnockoutScheduleItem[]>;
  knockouts: KnockoutWinners;
  groups: GroupStandings;
  thirdAssign: Record<string, string>;
  teamById: Map<string, TeamLite>;
  canEdit: boolean;
  onPickWinner: (matchNumber: number, teamId: string) => void;
  onPickThirdPlace: (
    matchNumber: number,
    side: "home" | "away",
    teamId: string,
  ) => void;
  onResetStage: (
    stage: "r32" | "r16" | "qf" | "sf" | "third_place" | "final",
  ) => void;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const ROUNDS: Array<{ key: "r32" | "r16" | "qf" | "sf" | "final"; label: string }> =
    [
      { key: "r32", label: fr ? "16ᵉ de finale" : "Round of 32" },
      { key: "r16", label: fr ? "8ᵉ de finale" : "Round of 16" },
      { key: "qf", label: fr ? "Quarts" : "Quarter-finals" },
      { key: "sf", label: fr ? "Demi-finales" : "Semi-finals" },
      { key: "final", label: fr ? "Finale" : "Final" },
    ];
  const thirdPlace = byStage["third_place"] ?? [];
  // Flat schedule so ties can resolve "L<n>" loser slots (third-place playoff).
  const schedule = Object.values(byStage).flat();
  const finalMatch = (byStage["final"] ?? [])[0];
  const championId = finalMatch
    ? (knockouts[String(finalMatch.match_number)] ?? null)
    : null;
  const champion = championId ? (teamById.get(championId) ?? null) : null;

  function Tie(m: KnockoutScheduleItem) {
    return (
      <KnockoutTie
        key={m.match_number}
        match={m}
        schedule={schedule}
        groups={groups}
        knockouts={knockouts}
        thirdAssign={thirdAssign}
        teamById={teamById}
        canEdit={canEdit}
        onPickWinner={onPickWinner}
        onPickThirdPlace={onPickThirdPlace}
        locale={locale}
      />
    );
  }

  return (
    <section className="space-y-4">
      <Card padded="sm" className="border-gold-500/20 bg-gold-500/[0.05]">
        <p className="flex items-start gap-2.5 text-xs leading-5 text-text-secondary">
          <Trophy className="mt-0.5 size-4 shrink-0 text-gold-400" strokeWidth={2} />
          <span>
            {fr
              ? "L'arbre se remplit depuis tes groupes. Tape l'équipe qui passe à chaque tour — de gauche à droite — jusqu'à couronner ton champion. C'est désormais SCORÉ : des points par bonne équipe qui atteint chaque tour, et un gros lot pour le champion, le finaliste et le 3e. Tout se verrouille 1 h avant le 1er match."
              : "The bracket fills from your groups. Tap the team that advances in each tie — left to right — all the way to your champion. It's now SCORED: points for each team you correctly send to each round, plus a big bonus for the champion, runner-up and 3rd place. Everything locks 1h before the first match."}
          </span>
        </p>
      </Card>

      {/* Horizontal bracket: rounds flow left → right to the trophy. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-3">
        <div className="flex min-w-max items-stretch gap-3">
          {ROUNDS.map((round) => {
            const matches = byStage[round.key] ?? [];
            const picked = matches.filter(
              (m) => knockouts[String(m.match_number)],
            ).length;
            return (
              <div key={round.key} className="flex w-60 shrink-0 flex-col">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    {round.key === "final" && (
                      <Crown
                        className="size-3.5 text-gold-300"
                        strokeWidth={2}
                      />
                    )}
                    {round.label}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-text-tertiary">
                      {picked}/{matches.length}
                    </span>
                    <ResetButton
                      disabled={!canEdit || picked === 0}
                      onClick={() => onResetStage(round.key)}
                      locale={locale}
                      size="xs"
                    />
                  </span>
                </div>
                <ul className="flex flex-1 flex-col justify-around gap-2">
                  {matches.map((m) => Tie(m))}
                </ul>
              </div>
            );
          })}

          {/* Champion column */}
          <div className="flex w-48 shrink-0 flex-col">
            <div className="mb-2 flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-gold-300">
              <Trophy className="size-3.5" strokeWidth={2} />
              Champion
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div
                className={cn(
                  "flex w-full flex-col items-center gap-3 rounded-md border p-4 text-center shadow-card",
                  champion
                    ? "border-gold-500/45 bg-gradient-to-b from-gold-500/[0.18] to-surface-1"
                    : "border-dashed border-white/[0.12] bg-surface-1",
                )}
              >
                <Trophy
                  className={cn(
                    "size-9",
                    champion ? "text-gold-300" : "text-text-tertiary",
                  )}
                  strokeWidth={1.5}
                />
                {champion ? (
                  <>
                    <Flag isoCode={champion.iso_code} size="2xl" />
                    <div className="font-display text-base font-bold leading-tight text-text-primary">
                      {fr ? champion.name_fr : champion.name_en}
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] leading-5 text-text-tertiary">
                    {fr
                      ? "Gagne la finale pour couronner ton champion."
                      : "Win the final to crown your champion."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3rd-place playoff */}
      {thirdPlace.length > 0 && (
        <div className="max-w-sm">
          <div className="mb-2 flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
            <Trophy className="size-3.5 text-amber-400" strokeWidth={2} />
            {fr ? "Match pour la 3ᵉ place" : "Third-place playoff"}
          </div>
          <ul className="space-y-2">{thirdPlace.map((m) => Tie(m))}</ul>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reset button                                                              */
/* -------------------------------------------------------------------------- */

function ResetButton({
  onClick,
  disabled,
  locale,
  size = "sm",
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  locale: Locale;
  size?: "xs" | "sm";
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={
        label ??
        (locale === "fr"
          ? "Réinitialiser cette section"
          : "Reset this section")
      }
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
