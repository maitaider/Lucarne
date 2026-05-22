import "server-only";
import {
  getStaticWorldCupMatchById,
  getStaticWorldCupMatches,
} from "@/data/world-cup-2026";
import { getSupabaseServer } from "@/lib/supabase/server";

// supabase-js types one-to-one embeds as arrays in some inference paths; pick first.
function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type MatchRow = {
  id: string;
  match_number: number | null;
  stage: string;
  group_label: string | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_team: TeamSnippet | TeamSnippet[] | null;
  away_team: TeamSnippet | TeamSnippet[] | null;
  venue: VenueSnippet | VenueSnippet[] | null;
};

function toMatchListItem(row: MatchRow): MatchListItem {
  return {
    id: row.id,
    match_number: row.match_number,
    stage: row.stage as MatchStage,
    group_label: row.group_label,
    kickoff_at: row.kickoff_at,
    status: row.status as MatchStatus,
    home_score: row.home_score,
    away_score: row.away_score,
    home_placeholder: row.home_placeholder,
    away_placeholder: row.away_placeholder,
    home_team: pickOne(row.home_team),
    away_team: pickOne(row.away_team),
    venue: pickOne(row.venue),
  };
}

export type MatchStage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third_place"
  | "final";

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

export type MatchListItem = {
  id: string;
  match_number: number | null;
  stage: MatchStage;
  group_label: string | null;
  kickoff_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_team: TeamSnippet | null;
  away_team: TeamSnippet | null;
  venue: VenueSnippet | null;
};

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
};

/**
 * Fetch all matches with team + venue joins. Server-only.
 * Returns empty array (and logs) if Supabase isn't configured.
 */
export async function listMatches(opts?: {
  stage?: MatchStage | "all";
  groupLabel?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<MatchListItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return filterMatches(getStaticWorldCupMatches(), opts);
  }

  const supabase = await getSupabaseServer();

  let query = supabase
    .schema("ref")
    .from("matches")
    .select(
      `
      id, match_number, stage, group_label, kickoff_at, status,
      home_score, away_score, home_placeholder, away_placeholder,
      home_team:teams!matches_home_team_id_fkey(id, fifa_code, iso_code, name_fr, name_en, flag_emoji, logo_url),
      away_team:teams!matches_away_team_id_fkey(id, fifa_code, iso_code, name_fr, name_en, flag_emoji, logo_url),
      venue:venue_id(id, name, city_fr, city_en)
    `,
    )
    .order("kickoff_at", { ascending: true });

  if (opts?.stage && opts.stage !== "all") query = query.eq("stage", opts.stage);
  if (opts?.groupLabel) query = query.eq("group_label", opts.groupLabel);
  if (opts?.fromDate) query = query.gte("kickoff_at", opts.fromDate);
  if (opts?.toDate) query = query.lte("kickoff_at", opts.toDate);

  const { data, error } = await query;
  if (error) {
    console.error("[matches:listMatches]", error);
    return [];
  }
  return (data ?? []).map(toMatchListItem);
}

export async function getMatchById(id: string): Promise<MatchListItem | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return getStaticWorldCupMatchById(id);

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .schema("ref")
    .from("matches")
    .select(
      `
      id, match_number, stage, group_label, kickoff_at, status,
      home_score, away_score, home_placeholder, away_placeholder,
      home_team:teams!matches_home_team_id_fkey(id, fifa_code, iso_code, name_fr, name_en, flag_emoji, logo_url),
      away_team:teams!matches_away_team_id_fkey(id, fifa_code, iso_code, name_fr, name_en, flag_emoji, logo_url),
      venue:venue_id(id, name, city_fr, city_en)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[matches:getMatchById]", error);
    return null;
  }
  return data ? toMatchListItem(data) : null;
}

function filterMatches(
  matches: MatchListItem[],
  opts?: {
    stage?: MatchStage | "all";
    groupLabel?: string;
    fromDate?: string;
    toDate?: string;
  },
): MatchListItem[] {
  return matches.filter((match) => {
    if (opts?.stage && opts.stage !== "all" && match.stage !== opts.stage) return false;
    if (opts?.groupLabel && match.group_label !== opts.groupLabel) return false;
    if (opts?.fromDate && match.kickoff_at < opts.fromDate) return false;
    if (opts?.toDate && match.kickoff_at > opts.toDate) return false;
    return true;
  });
}

/** Group an array of matches by ISO date (YYYY-MM-DD in app timezone). */
export function groupMatchesByDate(
  matches: MatchListItem[],
  timeZone = "Europe/Paris",
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
