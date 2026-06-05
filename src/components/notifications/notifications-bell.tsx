"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";
import {
  AtSign,
  BarChart3,
  Bell,
  CheckCheck,
  Megaphone,
  ShieldCheck,
  Trophy,
  Flame,
  MessageCircle,
  TrendingDown,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { NotificationRow } from "@/lib/notifications/queries";

const ICONS: Record<string, LucideIcon> = {
  bet_validated: ShieldCheck,
  bet_settled: Trophy,
  bet_rejected: X,
  match_kickoff: Bell,
  match_goal: Bell,
  league_invite: Bell,
  league_position: TrendingDown,
  comment_reply: Megaphone,
  comment_received: MessageCircle,
  chat_mention: AtSign,
  poll_vote: BarChart3,
  reaction_received: Flame,
  daily_challenge: Megaphone,
  friend_request: Bell,
};

const RXN_EMOJI: Record<string, string> = {
  fire: "🔥",
  clap: "👏",
  laugh: "😂",
  think: "🤔",
  shock: "😱",
  skull: "💀",
};

const ACCENT: Record<string, string> = {
  bet_validated: "text-primary-300 bg-primary-500/15 ring-primary-500/30",
  bet_settled: "text-gold-300 bg-gold-500/15 ring-gold-500/30",
  bet_rejected: "text-error bg-error/15 ring-error/30",
  comment_reply: "text-violet-300 bg-violet-500/15 ring-violet-500/30",
  comment_received: "text-violet-300 bg-violet-500/15 ring-violet-500/30",
  chat_mention: "text-primary-300 bg-primary-500/15 ring-primary-500/30",
  poll_vote: "text-violet-300 bg-violet-500/15 ring-violet-500/30",
  reaction_received: "text-gold-300 bg-gold-500/15 ring-gold-500/30",
  league_position: "text-gold-300 bg-gold-500/15 ring-gold-500/30",
  daily_challenge: "text-violet-300 bg-violet-500/15 ring-violet-500/30",
};

export function NotificationsBell({
  userId,
  initialUnread,
  initialItems,
  locale,
}: {
  userId: string;
  initialUnread: number;
  initialItems: NotificationRow[];
  locale: Locale;
}) {
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Realtime: insert new notifications at the top
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow & { user_id: string };
          setItems((prev) => [row, ...prev].slice(0, 30));
          setUnread((u) => u + 1);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Click outside / Escape closes
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    );
    setUnread(0);
  }

  async function handleMarkOne(id: string) {
    await markNotificationRead(id);
    setItems((prev) =>
      prev.map((n) =>
        n.id === id && !n.read_at
          ? { ...n, read_at: new Date().toISOString() }
          : n,
      ),
    );
    setUnread((u) => Math.max(u - 1, 0));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={locale === "fr" ? "Notifications" : "Notifications"}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-text-secondary transition hover:border-primary-500/40 hover:bg-primary-500/[0.08] hover:text-primary-300",
          open && "border-primary-500/40 bg-primary-500/[0.08] text-primary-300",
        )}
      >
        <Bell className="size-4" strokeWidth={1.7} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-500 px-1 font-mono text-[9px] font-bold text-abyss ring-2 ring-abyss">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="fixed inset-x-2 top-[60px] z-50 w-auto overflow-hidden rounded-[10px] border border-white/[0.1] bg-abyss/95 shadow-2xl backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[360px] sm:max-w-[90vw]"
        >
          <header className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold text-text-primary">
                {locale === "fr" ? "Notifications" : "Notifications"}
              </p>
              <p className="text-[10px] text-text-tertiary">
                {unread > 0
                  ? locale === "fr"
                    ? `${unread} non-lue${unread > 1 ? "s" : ""}`
                    : `${unread} unread`
                  : locale === "fr"
                    ? "Tout est lu"
                    : "All read"}
              </p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-300 transition hover:bg-primary-500/10"
              >
                <CheckCheck className="size-3" strokeWidth={2.5} />
                {locale === "fr" ? "Tout lire" : "Mark all"}
              </button>
            )}
          </header>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-text-tertiary">
                {locale === "fr"
                  ? "Pas encore de notification."
                  : "No notifications yet."}
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onRead={handleMarkOne}
                    locale={locale}
                    onNav={() => setOpen(false)}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-white/[0.08] px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-[11px] font-bold uppercase tracking-wider text-text-secondary transition hover:text-text-primary"
            >
              {locale === "fr" ? "Voir tout" : "View all"} →
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  n,
  onRead,
  locale,
  onNav,
}: {
  n: NotificationRow;
  onRead: (id: string) => void;
  locale: Locale;
  onNav: () => void;
}) {
  const Icon = ICONS[n.type] ?? Bell;
  const accent =
    ACCENT[n.type] ?? "text-text-secondary bg-white/[0.05] ring-white/[0.1]";
  const summary = summarize(n, locale);
  const link = linkFor(n);

  const content = (
    <div
      className={cn(
        "group flex items-start gap-3 px-4 py-3 transition hover:bg-white/[0.03]",
        !n.read_at && "bg-primary-500/[0.04]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ring-1",
          accent,
        )}
      >
        <Icon className="size-3.5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-primary">{summary}</p>
        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-text-tertiary">
          {relativeTime(n.created_at, locale)}
        </p>
      </div>
      {!n.read_at && (
        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary-400" />
      )}
    </div>
  );

  if (link) {
    return (
      <li>
        <Link
          href={link}
          onClick={() => {
            if (!n.read_at) onRead(n.id);
            onNav();
          }}
        >
          {content}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => !n.read_at && onRead(n.id)}
        className="w-full text-left"
      >
        {content}
      </button>
    </li>
  );
}

function summarize(n: NotificationRow, locale: Locale): string {
  const p = n.payload as Record<string, unknown>;
  switch (n.type) {
    case "bet_validated":
      return locale === "fr"
        ? "Ton pari a été validé par l'admin."
        : "Your bet was validated by the admin.";
    case "bet_settled":
      return locale === "fr"
        ? `Pari résolu : ${p.result === "won" ? "gagné 🎉" : "perdu"} · ${p.points ?? 0} pts`
        : `Bet settled: ${p.result === "won" ? "won 🎉" : "lost"} · ${p.points ?? 0} pts`;
    case "bet_rejected":
      return locale === "fr"
        ? "Ton pari a été rejeté."
        : "Your bet was rejected.";
    case "comment_reply":
      return locale === "fr"
        ? `Nouveau message dans la ligue : « ${String(p.preview ?? "").slice(0, 60)} »`
        : `New league post: "${String(p.preview ?? "").slice(0, 60)}"`;
    case "daily_challenge":
      return locale === "fr"
        ? `📰 ${String(p.title ?? "Nouvelle actualité")}`
        : `📰 ${String(p.title ?? "New post")}`;
    case "league_invite":
      return locale === "fr"
        ? "Tu as été invité à rejoindre une ligue."
        : "You've been invited to a league.";
    case "league_position":
      return locale === "fr"
        ? `@${p.by_username ?? "Un joueur"} t'a dépassé au classement (#${p.new_rank ?? "?"}).`
        : `@${p.by_username ?? "A player"} overtook you in the standings (#${p.new_rank ?? "?"}).`;
    case "reaction_received": {
      const emoji = RXN_EMOJI[String(p.reaction)] ?? "👏";
      const what =
        p.target_type === "bet"
          ? locale === "fr"
            ? "ton prono"
            : "your prediction"
          : locale === "fr"
            ? "ton commentaire"
            : "your comment";
      return locale === "fr"
        ? `${emoji} @${p.actor ?? "Quelqu'un"} a réagi à ${what}.`
        : `@${p.actor ?? "Someone"} reacted ${emoji} to ${what}.`;
    }
    case "comment_received":
      return locale === "fr"
        ? `@${p.actor ?? "Quelqu'un"} a répondu : « ${String(p.preview ?? "").slice(0, 60)} »`
        : `@${p.actor ?? "Someone"} replied: "${String(p.preview ?? "").slice(0, 60)}"`;
    case "poll_vote":
      return locale === "fr"
        ? `@${p.actor ?? "Quelqu'un"} a voté à ton sondage : « ${String(p.preview ?? "").slice(0, 50)} »`
        : `@${p.actor ?? "Someone"} voted on your poll: "${String(p.preview ?? "").slice(0, 50)}"`;
    case "chat_mention": {
      const preview = String(p.preview ?? "").slice(0, 60);
      if (p.kind === "reply")
        return locale === "fr"
          ? `@${p.actor ?? "Quelqu'un"} t'a répondu dans le Salon : « ${preview} »`
          : `@${p.actor ?? "Someone"} replied to you in the Lounge: "${preview}"`;
      return locale === "fr"
        ? `@${p.actor ?? "Quelqu'un"} t'a mentionné dans le Salon : « ${preview} »`
        : `@${p.actor ?? "Someone"} mentioned you in the Lounge: "${preview}"`;
    }
    default:
      return n.type;
  }
}

function linkFor(n: NotificationRow): string | null {
  const p = n.payload as Record<string, unknown>;
  switch (n.type) {
    case "bet_validated":
    case "bet_settled":
    case "bet_rejected":
      return "/bets";
    case "comment_reply":
      return p.league_id ? `/leagues` : null;
    case "daily_challenge":
      return "/news";
    case "league_invite":
      return "/leagues";
    case "reaction_received":
      return p.match_id ? `/matches/${p.match_id}` : null;
    case "comment_received":
      return p.match_id ? `/matches/${p.match_id}` : "/leagues";
    case "chat_mention":
    case "poll_vote":
      return "/chat";
    case "league_position":
      return "/leaderboard/global";
    default:
      return null;
  }
}

function relativeTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const diff = Math.max(Date.now() - d.getTime(), 0);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return locale === "fr" ? `il y a ${sec}s` : `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return locale === "fr" ? `il y a ${min} min` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return locale === "fr" ? `il y a ${hr} h` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return locale === "fr" ? `il y a ${day} j` : `${day}d ago`;
  return d.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    day: "2-digit",
    month: "short",
  });
}
