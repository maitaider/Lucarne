"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Subscribes to public.profiles changes for `userId` and returns the live
 * balance in cents. Starts from `initialCents` (server-rendered value).
 * Cleans up the channel on unmount.
 */
export function useRealtimeBalance(
  userId: string | null,
  initialCents: number,
): number {
  const [balance, setBalance] = useState(initialCents);

  useEffect(() => {
    setBalance(initialCents);
  }, [initialCents]);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newCents = (payload.new as { balance_cents?: number } | null)
            ?.balance_cents;
          if (typeof newCents === "number") {
            setBalance(newCents);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return balance;
}

/**
 * Subscribes to public.real_payments for new confirmed payments,
 * returns the live total collected (sum of confirmed - refunded).
 */
export function useRealtimePool(
  initialNetCents: number,
): { netCents: number; lastEventAt: string | null } {
  const [netCents, setNetCents] = useState(initialNetCents);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  useEffect(() => {
    setNetCents(initialNetCents);
  }, [initialNetCents]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("real_payments_pool")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "real_payments" },
        (payload) => {
          const row = payload.new as {
            amount_cents?: number;
            status?: string;
            received_at?: string;
          } | null;
          if (row?.status === "confirmed" && typeof row.amount_cents === "number") {
            setNetCents((prev) => prev + row.amount_cents!);
            setLastEventAt(row.received_at ?? new Date().toISOString());
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "real_payments" },
        (payload) => {
          const oldRow = payload.old as {
            amount_cents?: number;
            status?: string;
          } | null;
          const newRow = payload.new as {
            amount_cents?: number;
            status?: string;
          } | null;
          if (!newRow || !oldRow) return;
          // Confirmed → refunded: subtract amount
          if (oldRow.status === "confirmed" && newRow.status === "refunded") {
            setNetCents((prev) =>
              Math.max(prev - (newRow.amount_cents ?? 0), 0),
            );
            setLastEventAt(new Date().toISOString());
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { netCents, lastEventAt };
}
