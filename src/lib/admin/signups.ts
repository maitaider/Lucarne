import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAppSettings } from "./economy";

export type RecentSignup = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  total_paid_cents: number;
  balance_cents: number;
  role: string;
  /** True once a confirmed buy-in covers the seat price. */
  paid: boolean;
};

/**
 * Recent player sign-ups for the admin onboarding tracker, newest first.
 * Reads public.profiles (admin-readable via the profiles_select_all policy).
 * "paid" is derived from total_paid_cents vs the current seat price.
 */
export async function listRecentSignups(limit = 30): Promise<{
  signups: RecentSignup[];
  totalPlayers: number;
  paidPlayers: number;
}> {
  const empty = { signups: [], totalPlayers: 0, paidPlayers: 0 };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return empty;

  const supabase = await getSupabaseServer();
  const settings = await getAppSettings();
  const seat = settings.buy_in_amount_cents;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, created_at, total_paid_cents, balance_cents, role",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return empty;

  const players = data.filter((p) => p.role === "player");
  const signups: RecentSignup[] = players.map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    created_at: p.created_at,
    total_paid_cents: p.total_paid_cents ?? 0,
    balance_cents: p.balance_cents ?? 0,
    role: p.role,
    paid: (p.total_paid_cents ?? 0) >= seat,
  }));

  return {
    signups,
    totalPlayers: players.length,
    paidPlayers: signups.filter((s) => s.paid).length,
  };
}
