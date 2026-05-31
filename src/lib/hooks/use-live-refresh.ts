"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Keeps server-rendered standings (dashboard, league, leaderboard) live:
 *  - Realtime: refreshes the instant a match result is entered (ref.matches
 *    change → settle trigger already refreshed the standings views).
 *  - Polling fallback every `intervalMs` while the tab is visible.
 *  - Refresh when the tab regains focus.
 * Renders nothing; call from a tiny client component placed on a server page.
 */
export function useLiveRefresh(intervalMs = 60_000): void {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const timer = setInterval(refresh, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("live-standings")
      .on(
        "postgres_changes",
        { event: "*", schema: "ref", table: "matches" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [router, intervalMs]);
}
