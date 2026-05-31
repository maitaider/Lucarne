"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export type ActivityEvent = {
  id: string;
  kind: "bet_placed" | "payment" | "match_status";
  message: string;
  createdAt: string;
};

/**
 * Subscribes to public.bets INSERTs and real_payments INSERTs to build a
 * live activity ticker for the cockpit. Keeps the most recent 12 events.
 */
export function useRealtimeActivity(): ActivityEvent[] {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel("cockpit_activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bets" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            status?: string;
          } | null;
          if (!row?.id) return;
          push({
            id: `bet-${row.id}`,
            kind: "bet_placed",
            message: `Nouveau pronostic placé`,
            createdAt: new Date().toISOString(),
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "real_payments" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            amount_cents?: number;
            method?: string;
          } | null;
          if (!row?.id) return;
          push({
            id: `pay-${row.id}`,
            kind: "payment",
            message: `Accès confirmé`,
            createdAt: new Date().toISOString(),
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "ref", table: "matches" },
        (payload) => {
          const oldRow = payload.old as { status?: string } | null;
          const newRow = payload.new as {
            id?: string;
            status?: string;
          } | null;
          if (!newRow?.id) return;
          if (oldRow?.status === newRow.status) return;
          const label =
            newRow.status === "live"
              ? "🟣 Match en direct"
              : newRow.status === "finished"
                ? "⚪ Match terminé"
                : `Statut: ${newRow.status}`;
          push({
            id: `match-${newRow.id}-${newRow.status}`,
            kind: "match_status",
            message: label,
            createdAt: new Date().toISOString(),
          });
        },
      )
      .subscribe();

    function push(ev: ActivityEvent) {
      setEvents((prev) => [ev, ...prev.filter((e) => e.id !== ev.id)].slice(0, 12));
    }

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return events;
}
