import { getLocale } from "next-intl/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ScrollText } from "lucide-react";
import type { Locale } from "@/i18n/routing";

type AuditRow = {
  id: string;
  actor_username: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  payload: unknown;
  created_at: string;
};

export default async function AdminAuditPage() {
  const locale = (await getLocale()) as Locale;
  const fr = locale === "fr";
  const supabase = await getSupabaseServer();
  const { data } = await supabase.rpc("admin_list_audit_log", { p_limit: 200 });
  const rows = (data ?? []) as AuditRow[];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30">
          <ScrollText className="size-5" strokeWidth={1.6} />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {fr ? "Journal d'audit" : "Audit log"}
          </h2>
          <p className="mt-0.5 max-w-2xl text-sm text-text-tertiary">
            {fr
              ? "Les 200 dernières actions sensibles (paiements, rôles, résultats, recompute, tickets…)."
              : "The last 200 sensitive actions (payments, roles, results, recompute, tickets…)."}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-text-tertiary">
          {fr ? "Aucune entrée." : "No entries."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-white/[0.08] bg-surface-1/[0.55] backdrop-blur-xl">
          <table className="w-full">
            <thead className="border-b border-white/[0.08] bg-white/[0.03]">
              <tr className="text-[10px] uppercase tracking-wider text-text-tertiary">
                <th className="px-4 py-3 text-left font-bold">Date</th>
                <th className="px-4 py-3 text-left font-bold">
                  {fr ? "Acteur" : "Actor"}
                </th>
                <th className="px-4 py-3 text-left font-bold">Action</th>
                <th className="px-4 py-3 text-left font-bold">Cible</th>
                <th className="px-4 py-3 text-left font-bold">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {rows.map((r) => (
                <tr key={r.id} className="align-top transition hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-4 py-2.5 text-[11px] tabular-nums text-text-tertiary">
                    {new Date(r.created_at).toLocaleString(
                      fr ? "fr-CA" : "en-CA",
                      { dateStyle: "short", timeStyle: "short" },
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-secondary">
                    {r.actor_username ? `@${r.actor_username}` : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-[6px] bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-text-primary">
                      {r.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-text-tertiary">
                    {r.target_table ?? "—"}
                  </td>
                  <td className="max-w-[22rem] px-4 py-2.5">
                    <code className="block truncate font-mono text-[10px] text-text-tertiary">
                      {r.payload ? JSON.stringify(r.payload) : "—"}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
