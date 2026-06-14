import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AppSettings = {
  token_price_cents: number;
  /** Fixed seat price in cents (e.g. 2000 = $20 CAD). */
  buy_in_amount_cents: number;
  buy_in_deadline: string | null;
  tournament_start_at: string;
  tournament_end_at: string;
  prize_distribution: {
    shares: number[];
    house_rake_pct: number;
    description_fr: string;
    description_en: string;
  };
  scoring_rules: Record<string, number>;
  contact_label: string | null;
  contact_info: string | null;
  currency: string;
  /** Admin toggle: accept new players after the global lock (late entry). */
  late_entry_open: boolean;
  updated_at: string;
};

const DEFAULT: AppSettings = {
  token_price_cents: 100,
  buy_in_amount_cents: 2000,
  buy_in_deadline: null,
  tournament_start_at: "2026-06-11T20:00:00Z",
  tournament_end_at: "2026-07-19T21:00:00Z",
  prize_distribution: {
    shares: [50, 30, 20],
    // 6% rake covers Stripe processing + hosting; the remaining 94% funds the
    // prize pool, split 50/30/20 among the top 3.
    house_rake_pct: 6,
    description_fr: "50% au champion · 30% au 2ᵉ · 20% au 3ᵉ",
    description_en: "50% to champion · 30% to 2nd · 20% to 3rd",
  },
  scoring_rules: {
    match_winner: 2,
    exact_score: 8,
    first_scorer: 6,
    anytime_scorer: 3,
    both_teams_score: 2,
    over_under: 2.5,
    tournament_winner: 20,
    top_scorer: 15,
    // Phase finale (bracket) — points par bonne équipe atteignant le tour,
    // gros lot pour le podium. Cf. migration 20260606170000.
    bracket_r16: 1,
    bracket_qf: 3,
    bracket_sf: 6,
    bracket_final: 10,
    bracket_champion: 30,
    bracket_runner_up: 20,
    bracket_third: 15,
  },
  contact_label: "Lucarne Admin",
  contact_info: null,
  currency: "CAD",
  late_entry_open: false,
  updated_at: new Date().toISOString(),
};

export async function getAppSettings(): Promise<AppSettings> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return DEFAULT;
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("app_settings")
    .select(
      "token_price_cents, buy_in_amount_cents, buy_in_deadline, tournament_start_at, tournament_end_at, prize_distribution, scoring_rules, contact_label, contact_info, currency, late_entry_open, updated_at",
    )
    .eq("id", 1)
    .maybeSingle();
  if (!data) return DEFAULT;
  return {
    token_price_cents: data.token_price_cents,
    buy_in_amount_cents:
      data.buy_in_amount_cents ?? DEFAULT.buy_in_amount_cents,
    buy_in_deadline: data.buy_in_deadline,
    tournament_start_at: data.tournament_start_at,
    tournament_end_at: data.tournament_end_at,
    prize_distribution:
      (data.prize_distribution as AppSettings["prize_distribution"]) ??
      DEFAULT.prize_distribution,
    scoring_rules:
      (data.scoring_rules as AppSettings["scoring_rules"]) ??
      DEFAULT.scoring_rules,
    contact_label: data.contact_label,
    contact_info: data.contact_info,
    currency: data.currency ?? "CAD",
    late_entry_open: data.late_entry_open ?? false,
    updated_at: data.updated_at,
  };
}

/**
 * Effective buy-in deadline: explicit `buy_in_deadline` if set, otherwise
 * tournament_start_at - 1h. After this point the seat sales close.
 */
export function effectiveBuyInDeadline(settings: AppSettings): Date {
  if (settings.buy_in_deadline) return new Date(settings.buy_in_deadline);
  return new Date(
    new Date(settings.tournament_start_at).getTime() - 60 * 60 * 1000,
  );
}

/** True once the global prediction deadline has passed. Lives here (a lib, not
 *  a component) so callers don't trip the react-hooks/purity Date.now() rule. */
export function isBuyInDeadlinePassed(settings: AppSettings): boolean {
  return effectiveBuyInDeadline(settings).getTime() < Date.now();
}

/**
 * Public access price for unauthenticated pages (landing). app_settings is
 * readable only by `authenticated`, so we read it server-side with the
 * service-role client and expose ONLY the price + currency (never contact_info
 * etc.). Falls back to the default seat price if unavailable.
 */
export async function getPublicAccessPrice(): Promise<{
  amount_cents: number;
  currency: string;
}> {
  const fallback = {
    amount_cents: DEFAULT.buy_in_amount_cents,
    currency: DEFAULT.currency,
  };
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = getSupabaseAdmin();
  if (!admin) return fallback;
  const { data } = await admin
    .from("app_settings")
    .select("buy_in_amount_cents, currency")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return fallback;
  return {
    amount_cents: data.buy_in_amount_cents ?? fallback.amount_cents,
    currency: data.currency ?? fallback.currency,
  };
}

export type OverviewStats = {
  total_collected_cents: number;
  total_refunded_cents: number;
  payment_count: number;
  paying_users_count: number;
  net_cents: number;
};

export async function getOverviewStats(): Promise<OverviewStats> {
  const empty: OverviewStats = {
    total_collected_cents: 0,
    total_refunded_cents: 0,
    payment_count: 0,
    paying_users_count: 0,
    net_cents: 0,
  };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return empty;
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("admin_overview_stats")
    .select("*")
    .maybeSingle();
  if (!data) return empty;
  const collected = Number(data.total_collected_cents ?? 0);
  const refunded = Number(data.total_refunded_cents ?? 0);
  return {
    total_collected_cents: collected,
    total_refunded_cents: refunded,
    payment_count: Number(data.payment_count ?? 0),
    paying_users_count: Number(data.paying_users_count ?? 0),
    // Money in hand = confirmed total. A refunded payment already left
    // `confirmed` (its status flipped), so subtracting `refunded` again would
    // double-count and push net negative — it must NOT be subtracted.
    net_cents: collected,
  };
}

/**
 * Total real-money collected so far (sum of confirmed payments, cents) — the
 * SHARED projected prize pool, identical for every member. Reads the
 * `projected_prize_pool` SECURITY DEFINER RPC, which bypasses the per-row
 * `real_payments` RLS: `getOverviewStats` (security_invoker view) would collapse
 * to the caller's own payment for a non-admin, so the leaderboard's "Cagnotte
 * projetée" must use this instead. Exposes the aggregate only — no individual
 * amounts.
 */
export async function getProjectedCollectedCents(): Promise<number> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return 0;
  const supabase = await getSupabaseServer();
  const { data } = await supabase.rpc("projected_prize_pool");
  const row = Array.isArray(data) ? data[0] : data;
  return Number(row?.total_collected_cents ?? 0);
}

export type PotTotal = {
  /** Sum of CONFIRMED real_payments across all players (money in hand). */
  total_collected_cents: number;
  /** Distinct players with a confirmed payment. */
  paying_users_count: number;
};

/**
 * Global prize pool collected to date — read with the SERVICE-ROLE client
 * because `admin_overview_stats` is `security_invoker`, so a regular player
 * would only see their own payment rows (RLS). Exposes only the aggregate
 * (no per-user data), so it is safe to surface on the player dashboard.
 * Returns zeros when the service-role key is absent.
 */
export async function getPotTotal(): Promise<PotTotal> {
  const empty: PotTotal = { total_collected_cents: 0, paying_users_count: 0 };
  const admin = getSupabaseAdmin();
  if (!admin) return empty;
  const { data } = await admin
    .from("admin_overview_stats")
    .select("total_collected_cents, paying_users_count")
    .maybeSingle();
  if (!data) return empty;
  return {
    total_collected_cents: Number(data.total_collected_cents ?? 0),
    paying_users_count: Number(data.paying_users_count ?? 0),
  };
}

export type PaymentRow = {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  amount_cents: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  note: string | null;
  tokens_credited: number;
  received_at: string;
  refunded_at: string | null;
  refund_reason: string | null;
  recorded_by_name: string | null;
};

export async function listPayments(opts?: {
  status?: "all" | "confirmed" | "refunded" | "pending" | "cancelled";
  limit?: number;
}): Promise<PaymentRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();

  let query = supabase
    .from("real_payments")
    .select(
      `
      id, user_id, amount_cents, currency, method, status, reference, note,
      tokens_credited, received_at, refunded_at, refund_reason,
      user:profiles!real_payments_user_id_fkey(username, display_name),
      recorder:profiles!real_payments_recorded_by_fkey(username, display_name)
    `,
    )
    .order("received_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (opts?.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => {
    const author = pickOne(row.user);
    const recorder = pickOne(row.recorder);
    return {
      id: row.id,
      user_id: row.user_id,
      username: author?.username ?? "?",
      display_name: author?.display_name ?? null,
      amount_cents: row.amount_cents,
      currency: row.currency,
      method: row.method,
      status: row.status,
      reference: row.reference,
      note: row.note,
      tokens_credited: row.tokens_credited,
      received_at: row.received_at,
      refunded_at: row.refunded_at,
      refund_reason: row.refund_reason,
      recorded_by_name: recorder?.display_name ?? recorder?.username ?? null,
    };
  });
}

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export type AdminUserRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "player" | "admin" | "super_admin";
  bets_count: number;
  total_paid_cents: number;
  created_at: string;
  /** Archived (soft-deleted) — login disabled, hidden from standings. */
  is_archived: boolean;
  /** True when a hard purge is possible (no payments, not a recorder, owns no league). */
  can_purge: boolean;
};

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();

  // Get all profiles with their role (archived included, flagged)
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, role, created_at, deleted_at",
    )
    .order("created_at", { ascending: true });
  if (!profiles) return [];

  // Get bets count per user
  const { data: betCounts } = await supabase
    .from("bets")
    .select("user_id")
    .in("status", ["validated", "settled"]);
  const betsByUser = new Map<string, number>();
  for (const row of betCounts ?? []) {
    betsByUser.set(row.user_id, (betsByUser.get(row.user_id) ?? 0) + 1);
  }

  // Confirmed payments → total paid per user. Admins can read every payment (RLS).
  const { data: payments } = await supabase
    .from("real_payments")
    .select("user_id, amount_cents")
    .eq("status", "confirmed");
  const paidByUser = new Map<string, number>();
  for (const row of payments ?? []) {
    paidByUser.set(
      row.user_id,
      (paidByUser.get(row.user_id) ?? 0) + row.amount_cents,
    );
  }

  // Only owning a league still blocks a hard purge (leagues.owner_id is
  // `on delete restrict`); admin_purge_user now cascades the user's payments.
  const { data: leagues } = await supabase.from("leagues").select("owner_id");
  const ownsLeague = new Set<string>();
  for (const row of leagues ?? []) {
    if (row.owner_id) ownsLeague.add(row.owner_id);
  }

  return profiles.map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    role: p.role,
    bets_count: betsByUser.get(p.id) ?? 0,
    total_paid_cents: paidByUser.get(p.id) ?? 0,
    created_at: p.created_at,
    is_archived: p.deleted_at != null,
    can_purge: !ownsLeague.has(p.id),
  }));
}

/**
 * Compute estimated prize pool distribution based on settings.
 */
export function computePrizePool(
  totalCollectedCents: number,
  settings: AppSettings,
): { house_cents: number; pool_cents: number; payouts: number[] } {
  const housePct = settings.prize_distribution.house_rake_pct ?? 0;
  const houseCents = Math.floor((totalCollectedCents * housePct) / 100);
  const poolCents = totalCollectedCents - houseCents;
  const shares = settings.prize_distribution.shares ?? [];
  const payouts = shares.map((s) => Math.floor((poolCents * s) / 100));
  return { house_cents: houseCents, pool_cents: poolCents, payouts };
}

// formatMoney lives in lib/admin/money.ts so client components can use it
// without dragging the server-only economy module into the bundle. Re-export
// here for back-compat with existing server callers.
export { formatMoney } from "./money";
