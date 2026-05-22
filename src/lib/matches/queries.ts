import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

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
  match_number: number;
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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await getSupabaseServer();

  let query = supabase
    .schema("ref")
    .from("matches")
    .select(
      `
      id, match_number, stage, group_label, kickoff_at, status,
      home_score, away_score, home_placeholder, away_placeholder,
      home_team:home_team_id(id, fifa_code, name_fr, name_en, flag_emoji, logo_url),
      away_team:away_team_id(id, fifa_code, name_fr, name_en, flag_emoji, logo_url),
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
  return (data ?? []) as unknown as MatchListItem[];
}

export async function getMatchById(id: string): Promise<MatchListItem | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .schema("ref")
    .from("matches")
    .select(
      `
      id, match_number, stage, group_label, kickoff_at, status,
      home_score, away_score, home_placeholder, away_placeholder,
      home_team:home_team_id(id, fifa_code, name_fr, name_en, flag_emoji, logo_url),
      away_team:away_team_id(id, fifa_code, name_fr, name_en, flag_emoji, logo_url),
      venue:venue_id(id, name, city_fr, city_en)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[matches:getMatchById]", error);
    return null;
  }
  return data as unknown as MatchListItem | null;
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
