/**
 * Derive a group's finishing order from predicted match results.
 *
 * The "predict the matches" model: the user taps a result (home / draw /
 * away) for each of the 6 group fixtures, and the standings — which feed
 * the knockout bracket — are computed here. Points: win 3, draw 1, loss 0.
 *
 * Tiebreak (deterministic so the bracket always has a definite order):
 *   1. points
 *   2. head-to-head points among the teams tied on points
 *   3. wins
 *   4. the fallback order (stable — keeps a sensible, repeatable result
 *      when predictions can't separate teams)
 *
 * Pure + client-safe (no "server-only"): used by both the board and card.
 */
export type GroupResult = "home" | "draw" | "away" | null;

export type GroupFixture = {
  home_team_id: string | null;
  away_team_id: string | null;
  result: GroupResult;
};

export type TeamStat = { points: number; wins: number; played: number };

export type GroupComputed = {
  /** Team ids ordered best → worst. */
  order: string[];
  stats: Record<string, TeamStat>;
};

export function computeGroupOrder(
  fixtures: GroupFixture[],
  teamIds: string[],
  fallbackOrder: string[],
): GroupComputed {
  const points = new Map<string, number>();
  const wins = new Map<string, number>();
  const played = new Map<string, number>();
  for (const id of teamIds) {
    points.set(id, 0);
    wins.set(id, 0);
    played.set(id, 0);
  }

  const add = (map: Map<string, number>, id: string, n: number) =>
    map.set(id, (map.get(id) ?? 0) + n);

  for (const f of fixtures) {
    const { home_team_id: h, away_team_id: a, result } = f;
    if (!h || !a || !result) continue;
    if (!points.has(h) || !points.has(a)) continue;
    add(played, h, 1);
    add(played, a, 1);
    if (result === "home") {
      add(points, h, 3);
      add(wins, h, 1);
    } else if (result === "away") {
      add(points, a, 3);
      add(wins, a, 1);
    } else {
      add(points, h, 1);
      add(points, a, 1);
    }
  }

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
      const { home_team_id: h, away_team_id: a, result } = f;
      if (!h || !a || !result) continue;
      if (!set.has(h) || !set.has(a)) continue;
      if (result === "home") add(hp, h, 3);
      else if (result === "away") add(hp, a, 3);
      else {
        add(hp, h, 1);
        add(hp, a, 1);
      }
    }
    return hp;
  }

  const order = [...teamIds].sort((x, y) => {
    const px = points.get(x) ?? 0;
    const py = points.get(y) ?? 0;
    if (px !== py) return py - px;

    // Mini-league among everyone tied on this point total.
    const tied = teamIds.filter((id) => (points.get(id) ?? 0) === px);
    if (tied.length > 1) {
      const hp = headToHead(tied);
      const hx = hp.get(x) ?? 0;
      const hy = hp.get(y) ?? 0;
      if (hx !== hy) return hy - hx;
    }

    const wx = wins.get(x) ?? 0;
    const wy = wins.get(y) ?? 0;
    if (wx !== wy) return wy - wx;

    return fallbackIndex(x) - fallbackIndex(y);
  });

  const stats: Record<string, TeamStat> = {};
  for (const id of teamIds) {
    stats[id] = {
      points: points.get(id) ?? 0,
      wins: wins.get(id) ?? 0,
      played: played.get(id) ?? 0,
    };
  }

  return { order, stats };
}
