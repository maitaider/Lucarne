import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type ValidationQueueItem = {
  bet_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bet_type: string;
  payload: unknown;
  stake_cents: number;
  bet_status: string;
  validation_status: string | null;
  submitted_amount_cents: number | null;
  payment_method: string | null;
  payment_reference: string | null;
  request_at: string;
  match_id: string | null;
  kickoff_at: string | null;
  stage: string | null;
};

export async function isAdmin(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return true; // dev-friendly
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return data?.role === "admin" || data?.role === "super_admin";
}

export async function listValidationQueue(): Promise<ValidationQueueItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("admin_bet_validation_queue")
    .select("*");
  if (error) {
    console.error("[admin:listValidationQueue]", error);
    return [];
  }
  return (data ?? [])
    .filter((r) => r.bet_id && r.user_id && r.request_at)
    .map((r) => ({
      bet_id: r.bet_id!,
      user_id: r.user_id!,
      username: r.username ?? "",
      display_name: r.display_name,
      bet_type: r.bet_type ?? "",
      payload: r.payload,
      stake_cents: r.stake_cents ?? 0,
      bet_status: r.bet_status ?? "",
      validation_status: r.validation_status,
      submitted_amount_cents: r.submitted_amount_cents,
      payment_method: r.payment_method,
      payment_reference: r.payment_reference,
      request_at: r.request_at!,
      match_id: r.match_id,
      kickoff_at: r.kickoff_at,
      stage: r.stage,
    }));
}
