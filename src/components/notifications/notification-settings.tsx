"use client";

import { useState, useTransition } from "react";
import { setNotificationMutes } from "@/lib/notifications/actions";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";
import type { Locale } from "@/i18n/routing";

type Category = { key: string; fr: string; en: string; types: string[] };

const CATEGORIES: Category[] = [
  { key: "mentions", fr: "Mentions (@) dans le Salon", en: "Mentions in the Lounge", types: ["chat_mention"] },
  { key: "replies", fr: "Réponses à mes messages", en: "Replies to my messages", types: ["comment_received", "comment_reply"] },
  { key: "reactions", fr: "Réactions à mes messages/pronos", en: "Reactions to my messages/picks", types: ["reaction_received"] },
  { key: "polls", fr: "Votes sur mes sondages", en: "Votes on my polls", types: ["poll_vote"] },
  { key: "bets", fr: "Mes pronostics (validés/résolus)", en: "My predictions (validated/settled)", types: ["bet_validated", "bet_settled", "bet_rejected"] },
  { key: "standings", fr: "Classement (dépassements)", en: "Standings (overtakes)", types: ["league_position"] },
  { key: "matches", fr: "Matchs suivis (rappels, résultats)", en: "Followed matches (reminders, results)", types: ["match_kickoff", "match_goal", "match_result"] },
  { key: "news", fr: "Actus & annonces", en: "News & announcements", types: ["daily_challenge"] },
];

export function NotificationSettings({
  initialMuted,
  locale,
}: {
  initialMuted: string[];
  locale: Locale;
}) {
  const fr = locale === "fr";
  const toast = useToast();
  const [muted, setMuted] = useState<Set<string>>(() => new Set(initialMuted));
  const [, startTransition] = useTransition();

  function toggle(cat: Category) {
    const enabled = cat.types.every((t) => !muted.has(t)); // currently on?
    const next = new Set(muted);
    if (enabled) cat.types.forEach((t) => next.add(t)); // turn off → mute
    else cat.types.forEach((t) => next.delete(t)); // turn on → unmute
    setMuted(next);
    startTransition(async () => {
      const res = await setNotificationMutes([...next]);
      if (!res.ok) {
        setMuted(muted); // revert
        toast.error(fr ? "Échec de l'enregistrement." : "Save failed.");
      }
    });
  }

  return (
    <section className="rounded-[10px] border border-white/[0.1] bg-surface-1/[0.5] p-4 backdrop-blur-xl">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <SlidersHorizontal className="size-4 text-primary-300" strokeWidth={1.8} />
        {fr ? "Réglages des notifications" : "Notification settings"}
      </h2>
      <p className="mb-3 text-xs text-text-tertiary">
        {fr
          ? "Choisis ce que tu veux recevoir. Désactivé = masqué de la cloche et du compteur."
          : "Choose what you receive. Off = hidden from the bell and the count."}
      </p>
      <ul className="divide-y divide-white/[0.05]">
        {CATEGORIES.map((cat) => {
          const enabled = cat.types.every((t) => !muted.has(t));
          return (
            <li key={cat.key} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-text-secondary">{fr ? cat.fr : cat.en}</span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggle(cat)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition",
                  enabled ? "bg-primary-500" : "bg-white/[0.12]",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
                    enabled ? "left-[1.375rem]" : "left-0.5",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
