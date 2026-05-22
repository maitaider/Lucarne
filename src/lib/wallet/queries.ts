import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type Transaction = {
  id: string;
  direction: "credit" | "debit";
  amount_cents: number;
  reason: string;
  balance_after_cents: number;
  created_at: string;
  bet_id: string | null;
  league_id: string | null;
};

export async function getMyBalance(): Promise<number> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return 1000_00;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from("profiles")
    .select("balance_cents")
    .eq("id", user.id)
    .maybeSingle();
  return (data as { balance_cents?: number } | null)?.balance_cents ?? 0;
}

export async function listMyTransactions(limit = 50): Promise<Transaction[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("transactions")
    .select("id, direction, amount_cents, reason, balance_after_cents, created_at, bet_id, league_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[wallet:listMyTransactions]", error);
    return [];
  }
  return (data ?? []) as Transaction[];
}
