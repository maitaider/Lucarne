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
  /** True if a "buy your seat" CTA should be shown: unpaid + window open
   *  (before the global deadline, or admin-enabled late entry). */
  can_buy_in: boolean;
  /** The caller's EFFECTIVE edit deadline (global, or paid_at + 1 h for a late
   *  joiner) — for their personal countdown. */
  my_deadline_at: string;
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
  can_buy_in: false,
  my_deadline_at: new Date().toISOString(),
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
    my_deadline_at: deadline.toISOString(),
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
      // Single global lock: nobody edits after the deadline (admins included).
      can_bet: !deadlinePassed,
    };
  }

  // I-4: access is granted by the existence of a confirmed payment, NOT by
  // re-comparing its amount to the *current* price. Both rails already validate
  // the amount at creation (Stripe rejects underpayment; manual is the admin's
  // call), so a later price increase must not revoke a paid player's access.
  const { data: payment } = await supabase
    .from("real_payments")
    .select("amount_cents, received_at")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const paid = !!payment;
  const paidAtMs = payment?.received_at
    ? new Date(payment.received_at).getTime()
    : null;
  // Entrée tardive : paiement au/après le verrou global → fenêtre perso de 1 h
  // (à partir du paiement). Sinon, échéance = verrou global (inchangé). Mirroir
  // exact de la RPC SQL my_prediction_deadline().
  const isLate = paidAtMs !== null && paidAtMs >= deadline.getTime();
  const myDeadlineMs = isLate
    ? paidAtMs! + 60 * 60 * 1000
    : deadline.getTime();
  return {
    ...baseline,
    paid,
    paid_at: payment?.received_at ?? null,
    paid_cents: payment?.amount_cents ?? null,
    // Payeur normal : jusqu'au verrou global. Payeur tardif : jusqu'à
    // paiement + 1 h. Les déjà-verrouillés (payés avant le verrou) le restent.
    can_bet: paid && myDeadlineMs > Date.now(),
    // Bouton « Acheter ma place » : non-payeur + fenêtre ouverte (avant le
    // verrou OU entrée tardive activée par l'admin).
    can_buy_in: !paid && (!deadlinePassed || settings.late_entry_open),
    my_deadline_at: new Date(myDeadlineMs).toISOString(),
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
