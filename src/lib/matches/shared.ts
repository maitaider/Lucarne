/**
 * Client-safe match types + pure helpers. No `server-only` import so client
 * components (PicksBoard, etc.) can use these without dragging the server
 * data layer into the client bundle.
 *
 * The data fetchers (listMatches, getMatchById, etc.) live in queries.ts
 * which is server-only.
 */

export type MatchStage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third_place"
  | "final";

export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type TeamSnippet = {
  id: string;
  fifa_code: string;
  iso_code: string | null;
  name_fr: string;
  name_en: string;
  flag_emoji: string | null;
  logo_url: string | null;
};

export type VenueSnippet = {
  id: string;
  name: string;
  city_fr: string;
  city_en: string;
  /** Optional so the static (no-Supabase) fallback data stays valid. */
  country?: string | null;
  capacity?: number | null;
};

export type MatchListItem = {
  id: string;
  match_number: number | null;
  stage: MatchStage;
  group_label: string | null;
  kickoff_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  // Penalty shootout result (knockout ties). Optional: not fetched everywhere.
  home_pen?: number | null;
  away_pen?: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_team: TeamSnippet | null;
  away_team: TeamSnippet | null;
  venue: VenueSnippet | null;
};

/** Group an array of matches by ISO date (YYYY-MM-DD in app timezone). */
export function groupMatchesByDate(
  matches: MatchListItem[],
  timeZone = "America/Toronto",
): Map<string, MatchListItem[]> {
  const groups = new Map<string, MatchListItem[]>();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  for (const m of matches) {
    const date = formatter.format(new Date(m.kickoff_at));
    const list = groups.get(date) ?? [];
    list.push(m);
    groups.set(date, list);
  }
  return groups;
}

/**
 * A result is expected right now: the match is live, or it has kicked off
 * (scheduled & past kickoff) but isn't finished yet. Shared by the admin
 * results page (client clock) and the dashboard quick-results widget (server
 * time) so "what needs a score" is defined in exactly one place. `nowMs <= 0`
 * (clock not yet known) reports false to stay hydration-safe.
 */
export function isAwaitingResult(
  match: Pick<MatchListItem, "status" | "kickoff_at">,
  nowMs: number,
): boolean {
  if (match.status === "live") return true;
  return (
    match.status === "scheduled" &&
    nowMs > 0 &&
    new Date(match.kickoff_at).getTime() <= nowMs
  );
}

/** Sort comparator for the "to settle" view: live first, then soonest kickoff. */
export function compareLiveThenKickoff(
  a: Pick<MatchListItem, "status" | "kickoff_at">,
  b: Pick<MatchListItem, "status" | "kickoff_at">,
): number {
  if (a.status === "live" && b.status !== "live") return -1;
  if (b.status === "live" && a.status !== "live") return 1;
  return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
}
