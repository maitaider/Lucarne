"use server";

import { randomInt } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin/queries";
import { listMatches } from "@/lib/matches/queries";
import {
  resolveMatch,
  type BracketMatchInfo,
  type GroupStandings,
  type KnockoutWinners,
} from "./resolve-bracket";

/**
 * Admin action — "Verrouiller & remplir les pronostics".
 *
 * After the global deadline (1h before the first match), every PAID player who
 * left predictions empty gets RANDOM-filled gaps so they aren't stuck at 0:
 *   - missing group-match scores → a random scoreline (scored like any pick);
 *   - missing bracket → seeded groups + random winners up the tree + champion
 *     + a random 3rd-place winner (the bracket is now scored).
 * Only EMPTY cells are filled — existing picks are kept. Idempotent.
 *
 * Writes use the service-role client (the user-facing RPCs are deadline-locked).
 */
export type FillResult =
  | {
      ok: true;
      message: string;
      paid_users: number;
      bets_inserted: number;
      brackets_filled: number;
    }
  | { ok: false; message: string };

function pick<T>(arr: T[]): T {
  return arr[randomInt(arr.length)]!;
}

export async function fillRandomPredictions(): Promise<FillResult> {
  if (!(await isAdmin())) {
    return { ok: false, message: "Action réservée à l'admin." };
  }
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service indisponible." };

  // 1) Payeurs (un par utilisateur).
  const { data: payments, error: payErr } = await admin
    .from("real_payments")
    .select("user_id")
    .eq("status", "confirmed");
  if (payErr) return { ok: false, message: payErr.message };
  const paidUserIds = [
    ...new Set(
      (payments ?? [])
        .map((p) => p.user_id)
        .filter((id): id is string => !!id),
    ),
  ];
  if (paidUserIds.length === 0) {
    return {
      ok: true,
      message: "Aucun payeur à remplir.",
      paid_users: 0,
      bets_inserted: 0,
      brackets_filled: 0,
    };
  }

  // 2) Calendrier + équipes par groupe.
  const allMatches = await listMatches();
  const groupMatches = allMatches.filter((m) => m.stage === "group");
  const knockoutSchedule: BracketMatchInfo[] = allMatches
    .filter((m) => m.stage !== "group")
    .map((m) => ({
      match_number: m.match_number ?? 0,
      stage: m.stage as BracketMatchInfo["stage"],
      home_placeholder: m.home_placeholder,
      away_placeholder: m.away_placeholder,
    }));
  const groupTeams: Record<string, string[]> = {};
  for (const m of groupMatches) {
    if (!m.group_label) continue;
    const list = (groupTeams[m.group_label] ??= []);
    for (const t of [m.home_team, m.away_team]) {
      const tt = Array.isArray(t) ? t[0] : t;
      if (tt?.id && !list.includes(tt.id)) list.push(tt.id);
    }
  }

  let betsInserted = 0;
  let bracketsFilled = 0;

  for (const uid of paidUserIds) {
    // 3a) Scores de poule — compléter les exact_score manquants.
    const { data: existingBets } = await admin
      .from("bets")
      .select("match_id")
      .eq("user_id", uid)
      .eq("bet_type", "exact_score");
    const betMatchIds = new Set((existingBets ?? []).map((b) => b.match_id));
    const rows = groupMatches
      .filter((m) => !betMatchIds.has(m.id))
      .map((m) => ({
        user_id: uid,
        league_id: null,
        match_id: m.id,
        bet_type: "exact_score" as const,
        payload: { home: randomInt(5), away: randomInt(5) },
        stake_cents: 0,
        status: "validated" as const,
      }));
    if (rows.length > 0) {
      const { error } = await admin.from("bets").insert(rows);
      if (!error) betsInserted += rows.length;
    }

    // 3b) Arbre — compléter les vainqueurs manquants.
    const { data: tp } = await admin
      .from("tournament_predictions")
      .select("group_standings, knockout_winners, champion_team_id")
      .eq("user_id", uid)
      .maybeSingle();
    const filled = fillBracket(
      {
        group_standings: (tp?.group_standings as GroupStandings) ?? {},
        knockout_winners: (tp?.knockout_winners as KnockoutWinners) ?? {},
        champion_team_id: tp?.champion_team_id ?? null,
      },
      groupTeams,
      knockoutSchedule,
    );
    const { error: upErr } = await admin
      .from("tournament_predictions")
      .upsert(
        {
          user_id: uid,
          group_standings: filled.group_standings,
          knockout_winners: filled.knockout_winners,
          champion_team_id: filled.champion_team_id,
        },
        { onConflict: "user_id" },
      );
    if (!upErr) bracketsFilled += 1;
  }

  // 4) Recalcule l'arbre (0 pt tant qu'il n'y a pas de résultats — matérialise).
  await admin.rpc("recompute_bracket_points");

  return {
    ok: true,
    message: `Pronostics remplis pour ${paidUserIds.length} payeur(s) : ${betsInserted} score(s) de poule + ${bracketsFilled} arbre(s).`,
    paid_users: paidUserIds.length,
    bets_inserted: betsInserted,
    brackets_filled: bracketsFilled,
  };
}

/**
 * Pure bracket gap-filler. Keeps existing picks; fills empties with random but
 * VALID choices (a winner is always one of the resolved participants).
 */
function fillBracket(
  tp: {
    group_standings: GroupStandings;
    knockout_winners: KnockoutWinners;
    champion_team_id: string | null;
  },
  groupTeams: Record<string, string[]>,
  schedule: BracketMatchInfo[],
): {
  group_standings: GroupStandings;
  knockout_winners: KnockoutWinners;
  champion_team_id: string | null;
} {
  // Groupes : garder un classement complet, sinon ordre semé par défaut.
  const groups: GroupStandings = {};
  for (const [label, teams] of Object.entries(groupTeams)) {
    const existing = tp.group_standings?.[label];
    groups[label] =
      existing && existing.length === teams.length ? existing : [...teams];
  }
  const knockouts: KnockoutWinners = { ...tp.knockout_winners };
  const thirdAssign: Record<string, string> = {};

  const order: BracketMatchInfo["stage"][] = [
    "r32",
    "r16",
    "qf",
    "sf",
    "final",
    "third_place",
  ];
  const ordered = [...schedule].sort(
    (a, b) =>
      order.indexOf(a.stage) - order.indexOf(b.stage) ||
      a.match_number - b.match_number,
  );

  for (const m of ordered) {
    const key = String(m.match_number);

    if (m.stage === "third_place") {
      if (knockouts[key]) continue;
      // Perdants des deux demi-finales.
      const losers: string[] = [];
      for (const sf of schedule.filter((x) => x.stage === "sf")) {
        const { home, away } = resolveMatch(sf, groups, knockouts, thirdAssign);
        const w = knockouts[String(sf.match_number)];
        if (home.team_id && away.team_id && w) {
          losers.push(w === home.team_id ? away.team_id : home.team_id);
        }
      }
      if (losers.length === 2) knockouts[key] = pick(losers);
      continue;
    }

    // Affecter au hasard un 3e aux slots de repêchage non résolus.
    let { home, away } = resolveMatch(m, groups, knockouts, thirdAssign);
    for (const [side, slot] of [
      ["home", home],
      ["away", away],
    ] as const) {
      if (slot.is_third_place_pool && !slot.team_id) {
        const taken = new Set(Object.values(thirdAssign));
        const cands = slot.third_place_candidate_groups
          .map((g) => groups[g]?.[2])
          .filter((id): id is string => !!id && !taken.has(id));
        if (cands.length > 0) {
          thirdAssign[`${m.match_number}-${side}`] = pick(cands);
        }
      }
    }
    ({ home, away } = resolveMatch(m, groups, knockouts, thirdAssign));

    if (!knockouts[key] && home.team_id && away.team_id) {
      knockouts[key] = randomInt(2) === 0 ? home.team_id : away.team_id;
    }
  }

  const finalMatch = schedule.find((m) => m.stage === "final");
  const champion = finalMatch
    ? (knockouts[String(finalMatch.match_number)] ?? null)
    : null;
  return {
    group_standings: groups,
    knockout_winners: knockouts,
    champion_team_id: champion,
  };
}
