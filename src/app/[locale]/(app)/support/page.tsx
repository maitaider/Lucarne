import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/profile/queries";
import { getSupabaseServer } from "@/lib/supabase/server";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { SectionPanel } from "@/components/layout/section-panel";
import { SupportForm } from "@/components/support/support-form";
import { LifeBuoy, MessageSquare } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function SupportPage() {
  const locale = (await getLocale()) as Locale;
  const fr = locale === "fr";
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const supabase = await getSupabaseServer();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, message, status, admin_note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <AppPageShell width="wide">
      <PageHero
        kicker={fr ? "Support" : "Support"}
        kickerIcon={LifeBuoy}
        accent="primary"
        title={fr ? "Besoin d'aide ?" : "Need help?"}
        description={
          fr
            ? "Écris directement à l'administrateur — paiement, accès, pronostics, ou toute autre question. Tu seras recontacté ici."
            : "Message the admin directly — payment, access, predictions, or anything else. You'll be answered here."
        }
      />

      <SectionPanel
        icon={MessageSquare}
        title={fr ? "Ouvrir un ticket" : "Open a ticket"}
        accent="primary"
      >
        <SupportForm locale={locale} />
      </SectionPanel>

      {tickets && tickets.length > 0 && (
        <SectionPanel
          icon={LifeBuoy}
          title={fr ? "Mes demandes" : "My tickets"}
        >
          <ul className="space-y-2.5">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-text-primary">
                    {t.subject}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                      t.status === "resolved"
                        ? "bg-primary-500/15 text-primary-300 ring-primary-500/30"
                        : "bg-gold-500/15 text-gold-300 ring-gold-500/30"
                    }`}
                  >
                    {t.status === "resolved"
                      ? fr
                        ? "Résolu"
                        : "Resolved"
                      : fr
                        ? "En cours"
                        : "Open"}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-6 text-text-secondary">
                  {t.message}
                </p>
                {t.admin_note && (
                  <div className="mt-2 rounded-sm border border-primary-500/25 bg-primary-500/[0.06] p-2.5">
                    <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                      {fr ? "Réponse de l'organisateur" : "Reply from the organizer"}
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-6 text-text-secondary">
                      {t.admin_note}
                    </p>
                  </div>
                )}
                <p className="mt-1.5 text-[10px] text-text-tertiary">
                  {new Date(t.created_at).toLocaleString(
                    fr ? "fr-CA" : "en-CA",
                    { dateStyle: "medium", timeStyle: "short" },
                  )}
                </p>
              </li>
            ))}
          </ul>
        </SectionPanel>
      )}
    </AppPageShell>
  );
}
