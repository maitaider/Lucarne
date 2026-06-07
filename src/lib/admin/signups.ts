import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import { CHAT_BOT_USER_ID } from "@/lib/chat/constants";

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
 *
 * "paid" = a CONFIRMED `real_payments` row exists for the player — the single
 * source of truth for buy-in access (same as `getMyBuyInStatus` and the admin
 * Users table `listAdminUsers`). The legacy `profiles.total_paid_cents` is NOT
 * written by either payment rail (Stripe webhook or manual admin entry), so it
 * stayed 0 and made this card show paid players as "À payer" while the Users
 * table correctly showed them paid.
 */
export async function listRecentSignups(limit = 30): Promise<{
  signups: RecentSignup[];
  totalPlayers: number;
  paidPlayers: number;
}> {
  const empty = { signups: [], totalPlayers: 0, paidPlayers: 0 };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return empty;

  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, created_at, balance_cents, role",
    )
    .is("deleted_at", null)
    .neq("id", CHAT_BOT_USER_ID) // exclude the salon-bot system account
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return empty;

  const players = data.filter((p) => p.role === "player");

  // Confirmed access payments per player (admins can read every row via RLS),
  // summed exactly like the admin Users table does.
  const ids = players.map((p) => p.id);
  const paidByUser = new Map<string, number>();
  if (ids.length > 0) {
    const { data: payments } = await supabase
      .from("real_payments")
      .select("user_id, amount_cents")
      .eq("status", "confirmed")
      .in("user_id", ids);
    for (const row of payments ?? []) {
      paidByUser.set(
        row.user_id,
        (paidByUser.get(row.user_id) ?? 0) + row.amount_cents,
      );
    }
  }

  const signups: RecentSignup[] = players.map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    created_at: p.created_at,
    total_paid_cents: paidByUser.get(p.id) ?? 0,
    balance_cents: p.balance_cents ?? 0,
    role: p.role,
    paid: paidByUser.has(p.id),
  }));

  return {
    signups,
    totalPlayers: players.length,
    paidPlayers: signups.filter((s) => s.paid).length,
  };
}
