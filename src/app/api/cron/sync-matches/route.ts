import { NextResponse, type NextRequest } from "next/server";
import { fetchWorldCupFixtures, mapApiStatus } from "@/lib/football/api-football";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Cron: sync match scores/status from API-Football.
 *
 * Scheduled via vercel.json. Protected by CRON_SECRET header.
 * Frequency:
 *   - Off-day: hourly
 *   - Match day: every 5 min (handled by cron config)
 *   - Live: an Edge Function polls more frequently for active matches
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const fixtures = await fetchWorldCupFixtures();
    const supabase = await getSupabaseServer();

    let updated = 0;
    for (const f of fixtures) {
      const status = mapApiStatus(f.fixture.status.short);
      const { error } = await supabase
        .schema("ref")
        .from("matches")
        .update({
          status,
          home_score: f.goals.home,
          away_score: f.goals.away,
          last_synced_at: new Date().toISOString(),
        })
        .eq("external_id", String(f.fixture.id));

      if (!error) updated++;
    }

    return NextResponse.json({ ok: true, fixtures: fixtures.length, updated });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
