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

  const role = (data as { role?: string } | null)?.role;
  return role === "admin" || role === "super_admin";
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
  return (data ?? []) as unknown as ValidationQueueItem[];
}
