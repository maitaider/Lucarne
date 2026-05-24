import "server-only";

/**
 * Minimal API-Football v3 client.
 *
 * Env vars:
 *   API_FOOTBALL_KEY              — your API key (https://www.api-football.com/)
 *   API_FOOTBALL_BASE             — optional, defaults to the v3 API
 *
 * Free tier = 100 requests/day. Plan accordingly.
 *
 * Phase 2 wiring will add:
 *   - a cron route at /api/cron/sync-matches that polls every 5 min during
 *     a match window, fetches `fixtures/events?fixture=<id>`, and inserts
 *     goal rows into ref.match_events (linking ref.players.api_football_player_id
 *     ⇒ ref.players.id), which fires the existing settle trigger.
 *
 * For now this file just exposes the typed primitives so the cron job can
 * be slotted in with no new HTTP plumbing.
 */

const DEFAULT_BASE = "https://v3.football.api-sports.io";

export function isApiFootballConfigured(): boolean {
  return !!process.env.API_FOOTBALL_KEY;
}

export type ApiFootballGoalEvent = {
  fixture_id: number;
  team_id: number;
  player_id: number;
  player_name: string;
  minute: number;
  type: "Goal" | "Card" | "subst" | "Var";
  detail: string; // "Normal Goal" | "Penalty" | "Own Goal" | ...
};

type ApiResp<T> = {
  errors: string[] | Record<string, string>;
  results: number;
  response: T;
};

async function call<T>(path: string): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY missing");
  const base = process.env.API_FOOTBALL_BASE ?? DEFAULT_BASE;
  const res = await fetch(`${base}${path}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`api-football ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as ApiResp<T>;
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    throw new Error(`api-football: ${json.errors.join(", ")}`);
  }
  return json.response;
}

/**
 * Fetch all events for one fixture. Use during/after a match to pull goals
 * for auto-settlement.
 */
export async function fetchFixtureEvents(
  fixtureId: number,
): Promise<ApiFootballGoalEvent[]> {
  type Row = {
    time: { elapsed: number; extra: number | null };
    team: { id: number };
    player: { id: number | null; name: string | null };
    type: string;
    detail: string;
  };
  const rows = await call<Row[]>(`/fixtures/events?fixture=${fixtureId}`);
  return rows
    .filter(
      (r) => r.type === "Goal" && r.player.id != null && r.player.name != null,
    )
    .map((r) => ({
      fixture_id: fixtureId,
      team_id: r.team.id,
      player_id: r.player.id!,
      player_name: r.player.name!,
      minute: r.time.elapsed,
      type: "Goal",
      detail: r.detail,
    }));
}

/**
 * Fetch the squad for one team (by API-Football team id). Used by a
 * future "import roster" admin action.
 */
export async function fetchTeamSquad(teamId: number): Promise<
  Array<{
    id: number;
    name: string;
    age: number | null;
    number: number | null;
    position: string | null;
  }>
> {
  type Row = {
    team: { id: number };
    players: Array<{
      id: number;
      name: string;
      age: number | null;
      number: number | null;
      position: string | null;
    }>;
  };
  const rows = await call<Row[]>(`/players/squads?team=${teamId}`);
  return rows[0]?.players ?? [];
}
