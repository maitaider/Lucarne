import { getLocale } from "next-intl/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { SupportResolveButton } from "@/components/admin/support-resolve-button";
import { LifeBuoy } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function AdminSupportPage() {
  const locale = (await getLocale()) as Locale;
  const fr = locale === "fr";
  const supabase = await getSupabaseServer();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select(
      "id, subject, message, status, created_at, sender:user_id(username, display_name)",
    )
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    subject: string;
    message: string;
    status: string;
    created_at: string;
    sender: { username: string; display_name: string | null } | null;
  };
  const rows = (tickets ?? []) as unknown as Row[];
  const open = rows.filter((t) => t.status !== "resolved");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30">
          <LifeBuoy className="size-5" strokeWidth={1.6} />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {fr ? "Support" : "Support"}
          </h2>
          <p className="mt-0.5 text-sm text-text-tertiary">
            {fr
              ? `${open.length} ticket(s) en cours · tu es notifié à chaque nouveau message.`
              : `${open.length} open ticket(s) · you're notified on every new message.`}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-text-tertiary">
          {fr ? "Aucun ticket pour l'instant." : "No tickets yet."}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((t) => (
            <li
              key={t.id}
              className={`rounded-[10px] border p-4 ${
                t.status === "resolved"
                  ? "border-white/[0.06] bg-white/[0.015] opacity-70"
                  : "border-white/[0.1] bg-surface-1/[0.5]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text-primary">
                      {t.subject}
                    </span>
                    {t.status === "resolved" && (
                      <span className="shrink-0 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                        {fr ? "Résolu" : "Resolved"}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-text-tertiary">
                    {fr ? "De " : "From "}
                    <span className="text-text-secondary">
                      @{t.sender?.username ?? "?"}
                    </span>
                    {" · "}
                    {new Date(t.created_at).toLocaleString(
                      fr ? "fr-CA" : "en-CA",
                      { dateStyle: "medium", timeStyle: "short" },
                    )}
                  </div>
                </div>
                {t.status !== "resolved" && (
                  <SupportResolveButton ticketId={t.id} locale={locale} />
                )}
              </div>
              <p className="mt-2.5 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                {t.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
