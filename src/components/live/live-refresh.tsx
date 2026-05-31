"use client";

import { useLiveRefresh } from "@/lib/hooks/use-live-refresh";

/**
 * Drop-in (renders nothing) that keeps a server-rendered page's data live:
 * refreshes on a match result (Realtime), on tab focus, and on a poll interval.
 */
export function LiveRefresh({ intervalMs }: { intervalMs?: number }) {
  useLiveRefresh(intervalMs);
  return null;
}
