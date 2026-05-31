import { NextResponse, type NextRequest } from "next/server";
import {
  fetchWorldCupFixtures,
  mapApiStatus,
  ApiFootballError,
} from "@/lib/football/api-football";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Cron: sync match scores/status from API-Football into ref.matches.
 *
 * Scheduled via vercel.json, protected by CRON_SECRET. Matches are keyed by
 * ref.matches.api_football_fixture_id (must be mapped first). Writes go through
 * the cron_sync_match SECURITY DEFINER RPC using the service-role client
 * (ref.* is not writable by the API roles directly). Finishing a match fires
 * the settle trigger, so results flow to dashboards/leaderboard.
 *
 * Fails LOUDLY: misconfiguration / API errors return 500; a run that matches
 * zero fixtures is surfaced explicitly (usually means api_football_fixture_id
 * isn't mapped yet).
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("[cron:sync-matches] service-role client unavailable");
    return NextResponse.json(
      { ok: false, error: "service_role_unavailable" },
      { status: 500 },
    );
  }

  let fixtures;
  try {
    fixtures = await fetchWorldCupFixtures();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    // No API key configured is a benign "skip", not a crash.
    if (e instanceof ApiFootballError && e.status === 0) {
      console.warn("[cron:sync-matches] skipped:", msg);
      return NextResponse.json({ ok: true, skipped: true, reason: msg });
    }
    console.error("[cron:sync-matches] fetch failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  let matched = 0;
  let unmatched = 0;
  let errors = 0;
  for (const f of fixtures) {
    const { data, error } = await admin.rpc("cron_sync_match", {
      p_fixture_id: f.fixture.id,
      p_status: mapApiStatus(f.fixture.status.short),
      p_home: f.goals.home ?? undefined,
      p_away: f.goals.away ?? undefined,
    });
    if (error) {
      errors++;
      console.error(
        `[cron:sync-matches] fixture ${f.fixture.id} failed:`,
        error.message,
      );
    } else if (data === true) {
      matched++;
    } else {
      unmatched++;
    }
  }

  // Surface the common silent-failure mode explicitly.
  if (fixtures.length > 0 && matched === 0) {
    console.warn(
      `[cron:sync-matches] 0/${fixtures.length} fixtures matched — ` +
        `api_football_fixture_id is likely not mapped on ref.matches yet.`,
    );
  }
  if (errors > 0) {
    return NextResponse.json(
      { ok: false, fixtures: fixtures.length, matched, unmatched, errors },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    fixtures: fixtures.length,
    matched,
    unmatched,
  });
}
