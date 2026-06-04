"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Tiny module-level store for the salon's unread counter, shared by the desktop
 * nav and the mobile menu (they're both mounted) via one realtime channel — so
 * the two "Salon" badges never disagree and we don't open duplicate sockets.
 *
 * "Read" state is per-device (localStorage timestamp). A fresh device starts at
 * 0 (everything before the first visit counts as read).
 */

const LS_KEY = "lucarne:chat:lastReadAt";
const CAP = 99;

let count = 0;
let currentUserId: string | null = null;
let onChat = false;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function lastReadAt(): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  return localStorage.getItem(LS_KEY) ?? new Date(0).toISOString();
}

export function markChatRead() {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, new Date().toISOString());
  }
  if (count !== 0) {
    count = 0;
    emit();
  }
}

async function refreshInitial() {
  if (onChat) return;
  try {
    const supabase = getSupabaseBrowser();
    const { count: c } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("parent_type", "global")
      .is("deleted_at", null)
      .gt("created_at", lastReadAt());
    if (!onChat && typeof c === "number" && c > 0) {
      count = Math.min(c, CAP);
      emit();
    }
  } catch {
    /* best-effort */
  }
}

function ensureStarted() {
  if (started || typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  started = true;
  // First-ever visit on this device → treat history as read.
  if (!localStorage.getItem(LS_KEY)) {
    localStorage.setItem(LS_KEY, new Date().toISOString());
  }
  void refreshInitial();
  const supabase = getSupabaseBrowser();
  supabase
    .channel("chat:unread")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "comments",
        filter: "parent_type=eq.global",
      },
      (payload) => {
        const row = payload.new as { user_id: string };
        if (onChat) {
          markChatRead();
          return;
        }
        if (row.user_id === currentUserId) return;
        count = Math.min(count + 1, CAP);
        emit();
      },
    )
    .subscribe();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureStarted();
  return () => {
    listeners.delete(listener);
  };
}

/** Unread count of salon messages since this device last opened /chat. */
export function useChatUnread(userId: string | null): number {
  const pathname = usePathname();
  const isOnChat = pathname === "/chat" || pathname.startsWith("/chat/");

  useEffect(() => {
    currentUserId = userId;
    onChat = isOnChat;
    if (isOnChat) markChatRead();
  }, [userId, isOnChat]);

  return useSyncExternalStore(
    subscribe,
    () => count,
    () => 0,
  );
}
