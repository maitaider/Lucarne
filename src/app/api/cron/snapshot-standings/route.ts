import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Cron: daily snapshot of the global standings (one row per player per day) so
 * the leaderboard can show rank evolution, daily movements, and progression
 * charts. Scheduled ~04:00 UTC (≈ midnight Toronto = end of the local day) via
 * vercel.json, protected by CRON_SECRET. Idempotent — the
 * `cron_snapshot_standings` SECURITY DEFINER RPC upserts on (date, user).
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("[cron:snapshot-standings] service-role client unavailable");
    return NextResponse.json(
      { ok: false, error: "service_role_unavailable" },
      { status: 500 },
    );
  }

  const { data, error } = await admin.rpc("cron_snapshot_standings");
  if (error) {
    console.error("[cron:snapshot-standings]", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, snapshotted: data ?? 0 });
}
