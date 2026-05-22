import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type BetStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "validated"
  | "settled"
  | "rejected"
  | "refunded";

export type BetResult = "won" | "lost" | "push" | "void";

export type BetListItem = {
  id: string;
  bet_type: string;
  payload: unknown;
  stake_cents: number;
  status: BetStatus;
  result: BetResult | null;
  payout_cents: number;
  points: number;
  submitted_at: string;
  match: {
    id: string;
    stage: string;
    kickoff_at: string;
    status: string;
    home_team: { fifa_code: string; name_fr: string; name_en: string; flag_emoji: string | null } | null;
    away_team: { fifa_code: string; name_fr: string; name_en: string; flag_emoji: string | null } | null;
  } | null;
};

export async function listMyBets(): Promise<BetListItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("bets")
    .select(
      `
      id, bet_type, payload, stake_cents, status, result, payout_cents, points, submitted_at,
      match:match_id(
        id, stage, kickoff_at, status,
        home_team:home_team_id(fifa_code, name_fr, name_en, flag_emoji),
        away_team:away_team_id(fifa_code, name_fr, name_en, flag_emoji)
      )
    `,
    )
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("[bets:listMyBets]", error);
    return [];
  }
  return (data ?? []) as unknown as BetListItem[];
}
