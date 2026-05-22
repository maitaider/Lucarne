/**
 * Lucarne — API-Football wrapper (Sprint 1.1)
 *
 * Thin client over https://www.api-football.com/. Used by cron jobs to sync
 * the match schedule, scores, and events. Falls back to seed data when no
 * API_FOOTBALL_KEY is configured.
 *
 * Env required for live mode:
 *   API_FOOTBALL_KEY  — Pro plan ($19/mo recommended)
 *
 * Coverage notes:
 *   - Quotas: Pro = 7500 req/day. Plan ~6/h during live matches.
 *   - Logo URLs: stable CDN, but we rehost to Supabase Storage for resilience.
 */

const BASE = "https://v3.football.api-sports.io";
const WC_LEAGUE_ID = 1; // FIFA World Cup league id in API-Football
const WC_SEASON = 2026;

export class ApiFootballError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiFootballError";
  }
}

async function callApi<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  if (!process.env.API_FOOTBALL_KEY) {
    throw new ApiFootballError(
      0,
      "API_FOOTBALL_KEY not configured — using seed data only.",
    );
  }

  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-key": process.env.API_FOOTBALL_KEY,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
    next: { revalidate: 60 }, // 60s cache
  });

  if (!res.ok) {
    throw new ApiFootballError(res.status, await res.text());
  }
  const json = (await res.json()) as { response: T };
  return json.response;
}

export type RemoteFixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string; elapsed: number | null };
    venue: { id: number; name: string; city: string };
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
};

export async function fetchWorldCupFixtures(): Promise<RemoteFixture[]> {
  return callApi<RemoteFixture[]>("/fixtures", {
    league: WC_LEAGUE_ID,
    season: WC_SEASON,
  });
}

export async function fetchFixtureById(externalId: number): Promise<RemoteFixture | null> {
  const res = await callApi<RemoteFixture[]>("/fixtures", { id: externalId });
  return res[0] ?? null;
}

export type RemoteEvent = {
  time: { elapsed: number };
  team: { id: number; name: string };
  player: { id: number; name: string };
  type: "Goal" | "Card" | "subst" | "Var";
  detail: string;
};

export async function fetchFixtureEvents(externalId: number): Promise<RemoteEvent[]> {
  return callApi<RemoteEvent[]>("/fixtures/events", { fixture: externalId });
}

export type RemoteTeam = {
  team: { id: number; name: string; code: string; logo: string };
};

export async function fetchTeams(): Promise<RemoteTeam[]> {
  return callApi<RemoteTeam[]>("/teams", { league: WC_LEAGUE_ID, season: WC_SEASON });
}

/**
 * Status mapping API-Football → Lucarne match_status enum.
 */
export function mapApiStatus(short: string): "scheduled" | "live" | "finished" | "postponed" | "cancelled" {
  if (["NS", "TBD"].includes(short)) return "scheduled";
  if (["1H", "HT", "2H", "ET", "P", "BT"].includes(short)) return "live";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["PST", "SUSP", "INT"].includes(short)) return "postponed";
  if (["CANC", "ABD", "AWD", "WO"].includes(short)) return "cancelled";
  return "scheduled";
}
