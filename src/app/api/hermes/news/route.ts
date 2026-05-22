import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Hermes news ingestion endpoint
 * ------------------------------
 * POST /api/hermes/news
 *
 * Auth:
 *   - Header `Authorization: Bearer <HERMES_API_TOKEN>` required.
 *   - HERMES_API_TOKEN is set via env var (long random secret), shared
 *     with the Hermes agent only. Never exposed client-side.
 *
 * Body (JSON):
 *   {
 *     "title": "...",
 *     "body": "...",
 *     "kind": "news" | "announcement" | "release" | "match_recap" | "system",
 *     "cover_url": "https://..." (optional),
 *     "expires_at": "ISO timestamp" (optional)
 *   }
 *
 * Behavior:
 *   - Validates Zod schema.
 *   - Uses the Supabase service role key to call public.publish_news()
 *     bypassing user RLS (Hermes has no user session).
 *   - publish_news creates the post AND inserts a notification row for
 *     every active player so they see it in their bell.
 *
 * Returns:
 *   201 → { id: "<uuid>", title: "..." }
 *   401 → { error: "unauthorized" }
 *   400 → { error: "invalid_body", issues: [...] }
 *   500 → { error: "supabase_error", message: "..." }
 */

const bodySchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(5000),
  kind: z
    .enum(["news", "announcement", "release", "match_recap", "system"])
    .default("news"),
  cover_url: z.string().url().optional(),
  expires_at: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  // 1. Token check
  const expected = process.env.HERMES_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "hermes_not_configured", message: "HERMES_API_TOKEN missing" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  const presented = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!presented || presented !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate body
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // 3. Service-role Supabase client (bypasses RLS, runs as system)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "supabase_not_configured" },
      { status: 500 },
    );
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 4. Insert via RPC (notifies all players)
  const { data, error } = await admin.rpc("publish_news", {
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_kind: parsed.data.kind,
    p_source: "hermes",
    p_cover_url: parsed.data.cover_url,
    p_expires_at: parsed.data.expires_at,
  });

  if (error) {
    return NextResponse.json(
      { error: "supabase_error", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { id: data, title: parsed.data.title, kind: parsed.data.kind },
    { status: 201 },
  );
}

export async function GET() {
  // Quick health check
  return NextResponse.json({
    ok: true,
    service: "hermes",
    accepts: "POST application/json",
    fields: ["title", "body", "kind", "cover_url?", "expires_at?"],
  });
}
