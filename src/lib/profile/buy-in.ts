import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getAppSettings,
  effectiveBuyInDeadline,
  type AppSettings,
} from "@/lib/admin/economy";

export type BuyInStatus = {
  /** True if user can place / edit bets right now. */
  can_bet: boolean;
  /** True if a confirmed real_payments row covers the buy-in. */
  paid: boolean;
  /** True if the user is exempt because of role (admin / super_admin). */
  is_admin: boolean;
  /** ISO timestamp of the qualifying payment, if any. */
  paid_at: string | null;
  /** Cents paid by the qualifying payment, if any. */
  paid_cents: number | null;
  /** Seat price the user must cover. */
  amount_cents: number;
  /** Effective buy-in deadline (tournament_start - 1h or explicit override). */
  deadline_at: string;
  /** True if the buy-in deadline has passed. */
  deadline_passed: boolean;
  /** Snapshot of the app-wide settings used (currency, etc). */
  settings: AppSettings;
};

const ANON: Omit<BuyInStatus, "settings"> = {
  can_bet: false,
  paid: false,
  is_admin: false,
  paid_at: null,
  paid_cents: null,
  amount_cents: 2000,
  deadline_at: new Date().toISOString(),
  deadline_passed: false,
};

/**
 * Returns the buy-in status of the currently signed-in user.
 * Server-only — reads the live profile + the most recent confirmed payment.
 */
export async function getMyBuyInStatus(): Promise<BuyInStatus> {
  const settings = await getAppSettings();
  const deadline = effectiveBuyInDeadline(settings);
  const deadlinePassed = deadline.getTime() < Date.now();
  const baseline: BuyInStatus = {
    ...ANON,
    amount_cents: settings.buy_in_amount_cents,
    deadline_at: deadline.toISOString(),
    deadline_passed: deadlinePassed,
    settings,
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return baseline;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return baseline;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin =
    profile?.role === "admin" || profile?.role === "super_admin";

  if (isAdmin) {
    return {
      ...baseline,
      is_admin: true,
      can_bet: true,
    };
  }

  const { data: payment } = await supabase
    .from("real_payments")
    .select("amount_cents, received_at")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .gte("amount_cents", settings.buy_in_amount_cents)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const paid = !!payment;
  return {
    ...baseline,
    paid,
    paid_at: payment?.received_at ?? null,
    paid_cents: payment?.amount_cents ?? null,
    can_bet: paid, // payers can keep editing even after the seat-sale deadline
  };
}

export type PaymentReceipt = {
  id: string;
  amount_cents: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  received_at: string;
  refunded_at: string | null;
};

/**
 * Lists the signed-in user's own access payments (most recent first), for the
 * "Mes paiements / reçus" page. RLS restricts rows to the caller.
 */
export async function listMyPayments(): Promise<PaymentReceipt[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("real_payments")
    .select(
      "id, amount_cents, currency, method, status, reference, received_at, refunded_at",
    )
    .eq("user_id", user.id)
    .order("received_at", { ascending: false });

  return (data ?? []) as PaymentReceipt[];
}
