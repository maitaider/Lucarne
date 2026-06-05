import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Cron: nudge players who haven't predicted a match whose kickoff is near.
 *
 * Scheduled via vercel.json, protected by CRON_SECRET. All the logic lives in
 * the `cron_send_kickoff_reminders` SECURITY DEFINER RPC (service-role only):
 * it inserts `match_kickoff` notifications for paid players with no prediction
 * on upcoming matches, one per (player, match) — idempotent, so it's safe to
 * run as often as the schedule allows.
 *
 * Window (minutes) is tunable via ?within= to match the cron cadence:
 *   • daily cron  → default 1440 (24 h) = a once-a-day digest of the day ahead
 *   • hourly cron → ?within=180 = "kicks off in ~3 h" (needs Vercel Pro)
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("[cron:kickoff-reminders] service-role client unavailable");
    return NextResponse.json(
      { ok: false, error: "service_role_unavailable" },
      { status: 500 },
    );
  }

  const withinParam = Number(request.nextUrl.searchParams.get("within"));
  const within =
    Number.isFinite(withinParam) && withinParam > 0 ? Math.floor(withinParam) : 1440;

  const { data, error } = await admin.rpc("cron_send_kickoff_reminders", {
    p_within_minutes: within,
  });

  if (error) {
    console.error("[cron:kickoff-reminders] failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, within, sent: data ?? 0 });
}
