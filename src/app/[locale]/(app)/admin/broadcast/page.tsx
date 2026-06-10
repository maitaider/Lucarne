import { setRequestLocale } from "next-intl/server";
import { Megaphone, Clock, Info } from "lucide-react";
import { BroadcastForm } from "@/components/admin/broadcast-form";
import { emailEnabled } from "@/lib/email/resend";
import { countActiveMembers } from "@/lib/admin/recipients";
import type { Locale } from "@/i18n/routing";

export default async function AdminBroadcastPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  const [recipientCount, mailReady] = await Promise.all([
    countActiveMembers(),
    Promise.resolve(emailEnabled()),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3 rounded-md border border-white/[0.08] bg-surface-1/[0.5] p-5 backdrop-blur-xl">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gold-500/[0.12] text-gold-300 ring-1 ring-gold-500/30">
          <Megaphone className="size-4" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {fr ? "Diffusion & rappels" : "Broadcast & reminders"}
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-text-secondary">
            {fr
              ? "Envoie un message à tous les membres (salon, notification in-app et/ou courriel)."
              : "Send a message to all members (lounge, in-app notification and/or email)."}
          </p>
        </div>
      </header>

      <BroadcastForm
        locale={L}
        emailReady={mailReady}
        recipientCount={recipientCount}
      />

      {/* Automated reminder info */}
      <section className="rounded-md border border-white/[0.08] bg-surface-1/[0.4] p-5 backdrop-blur-xl">
        <header className="mb-2 flex items-center gap-2">
          <Clock className="size-4 text-primary-300" strokeWidth={1.8} />
          <h3 className="font-display text-sm font-semibold text-text-primary">
            {fr ? "Rappel automatique" : "Automated reminder"}
          </h3>
        </header>
        <p className="text-xs leading-5 text-text-secondary">
          {fr
            ? "En plus de la diffusion manuelle, un rappel automatique part chaque jour vers les joueurs ayant payé mais dont les pronostics sont incomplets, lorsque la date limite approche (≤ 7 jours). Chaque joueur ne reçoit ce rappel qu'une seule fois (in-app + courriel si configuré)."
            : "On top of manual broadcasts, an automated reminder runs daily to paid players with incomplete predictions as the deadline approaches (≤ 7 days). Each player gets it only once (in-app + email if configured)."}
        </p>
        {!mailReady && (
          <p className="mt-3 flex items-start gap-2 rounded-sm border border-gold-500/20 bg-gold-500/[0.06] px-3 py-2 text-[11px] leading-4 text-gold-200">
            <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
            {fr
              ? "Les courriels sont désactivés tant que RESEND_API_KEY et EMAIL_FROM ne sont pas définis sur Vercel. Les notifications in-app fonctionnent déjà."
              : "Emails are disabled until RESEND_API_KEY and EMAIL_FROM are set on Vercel. In-app notifications already work."}
          </p>
        )}
      </section>
    </div>
  );
}
