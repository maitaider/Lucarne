/**
 * Derive a group's finishing order from predicted match scorelines.
 *
 * The "predict the matches" model: the user enters a score for each of the
 * 6 group fixtures (e.g. 2–1), and the standings — which feed the knockout
 * bracket — are computed here. Points: win 3, draw 1, loss 0.
 *
 * Tiebreak (deterministic so the bracket always has a definite order):
 *   1. points
 *   2. goal difference
 *   3. goals for
 *   4. head-to-head points among the teams tied on points
 *   5. the fallback order (stable — repeatable when nothing separates teams)
 *
 * Pure + client-safe (no "server-only"): used by both the board and card.
 */
export type GroupFixture = {
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
};

export type TeamStat = {
  points: number;
  wins: number;
  played: number;
  gf: number;
  ga: number;
  gd: number;
};

export type GroupComputed = {
  /** Team ids ordered best → worst. */
  order: string[];
  stats: Record<string, TeamStat>;
};

type Result = "home" | "away" | "draw" | null;

function resultOf(f: GroupFixture): Result {
  if (f.home_goals == null || f.away_goals == null) return null;
  if (f.home_goals > f.away_goals) return "home";
  if (f.away_goals > f.home_goals) return "away";
  return "draw";
}

export function computeGroupOrder(
  fixtures: GroupFixture[],
  teamIds: string[],
  fallbackOrder: string[],
): GroupComputed {
  const stat = new Map<string, TeamStat>();
  for (const id of teamIds) {
    stat.set(id, { points: 0, wins: 0, played: 0, gf: 0, ga: 0, gd: 0 });
  }

  for (const f of fixtures) {
    const { home_team_id: h, away_team_id: a, home_goals: hg, away_goals: ag } = f;
    const res = resultOf(f);
    if (!h || !a || res == null || hg == null || ag == null) continue;
    if (!stat.has(h) || !stat.has(a)) continue;
    const sh = stat.get(h)!;
    const sa = stat.get(a)!;
    sh.played += 1;
    sa.played += 1;
    sh.gf += hg;
    sh.ga += ag;
    sa.gf += ag;
    sa.ga += hg;
    if (res === "home") {
      sh.points += 3;
      sh.wins += 1;
    } else if (res === "away") {
      sa.points += 3;
      sa.wins += 1;
    } else {
      sh.points += 1;
      sa.points += 1;
    }
  }
  for (const s of stat.values()) s.gd = s.gf - s.ga;

  const fallbackIndex = (id: string) => {
    const i = fallbackOrder.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  /** Head-to-head points using only matches played among `subset`. */
  function headToHead(subset: string[]): Map<string, number> {
    const hp = new Map<string, number>();
    const set = new Set(subset);
    for (const id of subset) hp.set(id, 0);
    for (const f of fixtures) {
      const { home_team_id: h, away_team_id: a } = f;
      const res = resultOf(f);
      if (!h || !a || res == null) continue;
      if (!set.has(h) || !set.has(a)) continue;
      if (res === "home") hp.set(h, (hp.get(h) ?? 0) + 3);
      else if (res === "away") hp.set(a, (hp.get(a) ?? 0) + 3);
      else {
        hp.set(h, (hp.get(h) ?? 0) + 1);
        hp.set(a, (hp.get(a) ?? 0) + 1);
      }
    }
    return hp;
  }

  const order = [...teamIds].sort((x, y) => {
    const sx = stat.get(x)!;
    const sy = stat.get(y)!;
    if (sx.points !== sy.points) return sy.points - sx.points;
    if (sx.gd !== sy.gd) return sy.gd - sx.gd;
    if (sx.gf !== sy.gf) return sy.gf - sx.gf;

    // Mini-league among everyone tied on this point total.
    const tied = teamIds.filter((id) => (stat.get(id)?.points ?? 0) === sx.points);
    if (tied.length > 1) {
      const hp = headToHead(tied);
      const hx = hp.get(x) ?? 0;
      const hy = hp.get(y) ?? 0;
      if (hx !== hy) return hy - hx;
    }

    return fallbackIndex(x) - fallbackIndex(y);
  });

  const stats: Record<string, TeamStat> = {};
  for (const id of teamIds) stats[id] = stat.get(id)!;

  return { order, stats };
}
