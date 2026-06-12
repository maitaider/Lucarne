"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { updateAppSettings } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import { CalendarClock, Loader2, MessageSquare, Save } from "lucide-react";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SettingsForm({
  initial,
  locale,
}: {
  initial: {
    tournament_start_at: string | null;
    tournament_end_at: string | null;
    contact_label: string | null;
    contact_info: string | null;
  };
  locale: "fr" | "en";
}) {
  const fr = locale === "fr";
  const router = useRouter();
  const toast = useToast();
  const [start, setStart] = useState(toLocalInput(initial.tournament_start_at));
  const [end, setEnd] = useState(toLocalInput(initial.tournament_end_at));
  const [label, setLabel] = useState(initial.contact_label ?? "");
  const [info, setInfo] = useState(initial.contact_info ?? "");
  const [pending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const res = await updateAppSettings({
        tournament_start_at: start ? new Date(start).toISOString() : undefined,
        tournament_end_at: end ? new Date(end).toISOString() : undefined,
        contact_label: label.trim() || undefined,
        contact_info: info.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.message ?? (fr ? "Erreur" : "Error"));
        return;
      }
      toast.success(fr ? "Réglages enregistrés" : "Settings saved");
      router.refresh();
    });
  }

  const fieldCls =
    "w-full rounded-sm border border-white/[0.1] bg-abyss/[0.5] px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary-500";

  return (
    <div className="space-y-6">
      {/* Tournament window */}
      <section className="rounded-md border border-white/[0.08] bg-surface-1/[0.55] p-5 backdrop-blur-xl">
        <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-text-primary">
          <CalendarClock className="size-4 text-gold-400" strokeWidth={1.8} />
          {fr ? "Fenêtre du tournoi" : "Tournament window"}
        </h2>
        <p className="mb-4 text-xs text-text-tertiary">
          {fr
            ? "Pilote les comptes à rebours et la date limite des pronos de groupe (heure locale)."
            : "Drives the countdowns and the group-pick lock (your local time)."}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
              {fr ? "Coup d'envoi (1er match)" : "Kickoff (first match)"}
            </span>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={fieldCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
              {fr ? "Fin du tournoi (finale)" : "Tournament end (final)"}
            </span>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={fieldCls}
            />
          </label>
        </div>
      </section>

      {/* Contact / payment */}
      <section className="rounded-md border border-white/[0.08] bg-surface-1/[0.55] p-5 backdrop-blur-xl">
        <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-text-primary">
          <MessageSquare className="size-4 text-primary-400" strokeWidth={1.8} />
          {fr ? "Contact & paiement" : "Contact & payment"}
        </h2>
        <p className="mb-4 text-xs text-text-tertiary">
          {fr
            ? "Affiché aux joueurs pour régler leur place (ex. Interac, virement, PayPal…)."
            : "Shown to players to pay their seat (e.g. Interac, transfer, PayPal…)."}
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
              {fr ? "Intitulé du contact" : "Contact label"}
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={fr ? "Ex. Mehdi (organisateur)" : "e.g. Mehdi (host)"}
              maxLength={120}
              className={fieldCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
              {fr ? "Instructions de paiement" : "Payment instructions"}
            </span>
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={
                fr
                  ? "Ex. Interac à mehdi@email.com — note ton @username"
                  : "e.g. Interac to mehdi@email.com — include your @username"
              }
              className={`${fieldCls} resize-y`}
            />
          </label>
        </div>
      </section>

      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary-500 px-5 py-2.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" strokeWidth={1.8} />
        )}
        {fr ? "Enregistrer les réglages" : "Save settings"}
      </button>
    </div>
  );
}
