import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type MyPick = {
  bet_id: string;
  match_id: string;
  bet_type: "match_winner" | "total_goals" | "anytime_scorer" | string;
  payload: unknown;
  status: string;
  result: string | null;
  points: number;
  submitted_at: string;
};

/**
 * Returns the current user's active picks indexed by `${match_id}:${bet_type}`.
 * Includes settled bets so the dashboard can show won/lost on past matches.
 * Map key allows O(1) lookup in components rendering many matches.
 */
export async function getMyPicksByMatch(): Promise<Map<string, MyPick[]>> {
  const map = new Map<string, MyPick[]>();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return map;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return map;

  const { data } = await supabase
    .from("bets")
    .select(
      "id, match_id, bet_type, payload, status, result, points, submitted_at",
    )
    .eq("user_id", user.id)
    .not("match_id", "is", null);

  for (const b of data ?? []) {
    if (!b.match_id) continue;
    const pick: MyPick = {
      bet_id: b.id,
      match_id: b.match_id,
      bet_type: b.bet_type,
      payload: b.payload,
      status: b.status,
      result: b.result,
      points: b.points,
      submitted_at: b.submitted_at,
    };
    const arr = map.get(b.match_id) ?? [];
    arr.push(pick);
    map.set(b.match_id, arr);
  }
  return map;
}

/**
 * Fetch a single user's pick for one specific (match, betType).
 * Used by the QuickBet sheet to prefill when re-opening the modal.
 */
export async function getMyPickForMatch(
  matchId: string,
  betType?: string,
): Promise<MyPick | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let q = supabase
    .from("bets")
    .select(
      "id, match_id, bet_type, payload, status, result, points, submitted_at",
    )
    .eq("user_id", user.id)
    .eq("match_id", matchId)
    .order("submitted_at", { ascending: false })
    .limit(1);
  if (betType) q = q.eq("bet_type", betType as never);

  const { data } = await q.maybeSingle();
  if (!data || !data.match_id) return null;
  return {
    bet_id: data.id,
    match_id: data.match_id,
    bet_type: data.bet_type,
    payload: data.payload,
    status: data.status,
    result: data.result,
    points: data.points,
    submitted_at: data.submitted_at,
  };
}
