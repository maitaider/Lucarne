import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listRecipientsByIds } from "@/lib/admin/recipients";
import { sendBroadcastEmail } from "@/lib/email/resend";

/**
 * Cron: remind paid players to finish their predictions before the global lock.
 *
 * Scheduled via vercel.json, protected by CRON_SECRET. The idempotent in-app
 * part lives in `cron_send_predict_reminders` (SECURITY DEFINER, service-role):
 * it notifies paid players with incomplete predictions when the deadline is
 * within ?days= (default 7), once each, and RETURNS the user ids it just
 * notified — we then email exactly those (skipped silently if Resend is off).
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("[cron:reminders] service-role client unavailable");
    return NextResponse.json(
      { ok: false, error: "service_role_unavailable" },
      { status: 500 },
    );
  }

  const daysParam = Number(request.nextUrl.searchParams.get("days"));
  const within =
    Number.isFinite(daysParam) && daysParam > 0 ? Math.floor(daysParam) : 7;

  const { data, error } = await admin.rpc("cron_send_predict_reminders", {
    p_within_days: within,
  });
  if (error) {
    console.error("[cron:reminders] rpc failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const ids = (Array.isArray(data) ? data : []) as string[];

  let emailed = 0;
  let emailSkipped = true;
  if (ids.length > 0) {
    const recipients = await listRecipientsByIds(ids);
    const res = await sendBroadcastEmail({
      recipients,
      subject: "Termine tes pronostics — Lucarne",
      heading: "La date limite approche",
      body: "Il te reste peu de temps pour compléter tes pronostics (groupes + phase finale) avant le verrouillage.\n\nDès que la première rencontre commence, plus aucune modification n'est possible — et les pronos manquants sont remplis aléatoirement.",
      ctaLabel: "Compléter mes pronostics",
      ctaUrl:
        (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.lucarne.ca") + "/predict",
    });
    emailed = res.sent;
    emailSkipped = res.skipped;
    if (res.error) console.error("[cron:reminders] email error:", res.error);
  }

  return NextResponse.json({
    ok: true,
    within,
    notified: ids.length,
    emailed,
    emailSkipped,
  });
}
