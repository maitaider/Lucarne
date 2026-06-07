"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";
import {
  Bell,
  CheckCheck,
  Megaphone,
  Trophy,
  ShieldCheck,
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
  comment_reply: Megaphone,
  comment_received: MessageCircle,
  reaction_received: Flame,
  league_position: TrendingDown,
  daily_challenge: Megaphone,
  match_result: Trophy,
};

const RXN_EMOJI: Record<string, string> = {
  fire: "🔥",
  clap: "👏",
  laugh: "😂",
  think: "🤔",
  shock: "😱",
  skull: "💀",
};

export function NotificationsList({
  initial,
  locale,
  userId,
}: {
  initial: NotificationRow[];
  locale: Locale;
  userId: string;
}) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`notif_page:${userId}`)
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
          setItems((prev) => [row, ...prev]);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = items.filter((n) => !n.read_at).length;

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setItems((prev) =>
      prev.map((n) =>
        n.read_at ? n : { ...n, read_at: new Date().toISOString() },
      ),
    );
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
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-white/[0.1] bg-surface-1/[0.4] p-10 text-center">
        <Bell className="mx-auto mb-3 size-6 text-text-tertiary" strokeWidth={1.5} />
        <p className="text-sm text-text-secondary">
          {locale === "fr"
            ? "Pas encore de notification. Tout commence ici dès que ça bouge."
            : "No notifications yet. Activity will land here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <div className="flex items-center justify-between rounded-md bg-white/[0.03] px-4 py-2">
          <span className="text-xs text-text-secondary">
            {locale === "fr"
              ? `${unread} non-lue${unread > 1 ? "s" : ""}`
              : `${unread} unread`}
          </span>
          <button
            type="button"
            onClick={handleMarkAll}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-300 transition hover:bg-primary-500/10"
          >
            <CheckCheck className="size-3" strokeWidth={2.5} />
            {locale === "fr" ? "Tout marquer lu" : "Mark all read"}
          </button>
        </div>
      )}

      <ul className="overflow-hidden rounded-[10px] border border-white/[0.08] bg-surface-1/[0.5] backdrop-blur-xl">
        {items.map((n) => (
          <NotifRow
            key={n.id}
            n={n}
            onRead={handleMarkOne}
            locale={locale}
          />
        ))}
      </ul>
    </div>
  );
}

function NotifRow({
  n,
  onRead,
  locale,
}: {
  n: NotificationRow;
  onRead: (id: string) => void;
  locale: Locale;
}) {
  const Icon = ICONS[n.type] ?? Bell;
  const summary = summarize(n, locale);
  const link = linkFor(n);
  const content = (
    <div
      className={cn(
        "flex items-start gap-3 border-t border-white/[0.05] px-4 py-3 transition hover:bg-white/[0.03]",
        !n.read_at && "bg-primary-500/[0.04]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ring-1",
          n.read_at
            ? "bg-white/[0.04] text-text-tertiary ring-white/[0.08]"
            : "bg-primary-500/15 text-primary-300 ring-primary-500/30",
        )}
      >
        <Icon className="size-4" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">{summary}</p>
        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-text-tertiary">
          {new Date(n.created_at).toLocaleString(
            locale === "fr" ? "fr-CA" : "en-CA",
            { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" },
          )}
        </p>
      </div>
      {!n.read_at && (
        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary-400" />
      )}
    </div>
  );

  if (link) {
    return (
      <li>
        <Link href={link} onClick={() => !n.read_at && onRead(n.id)}>
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
        className="block w-full text-left"
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
        : "Your bet was validated.";
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
        ? `Nouveau message dans la ligue : « ${String(p.preview ?? "").slice(0, 80)} »`
        : `New league post: "${String(p.preview ?? "").slice(0, 80)}"`;
    case "daily_challenge": {
      const icon = p.reason === "predict_deadline" ? "⏰" : "📰";
      const fallback = locale === "fr" ? "Nouvelle actualité" : "New post";
      return `${icon} ${String(p.title ?? fallback)}`;
    }
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
        ? `@${p.actor ?? "Quelqu'un"} a répondu : « ${String(p.preview ?? "").slice(0, 80)} »`
        : `@${p.actor ?? "Someone"} replied: "${String(p.preview ?? "").slice(0, 80)}"`;
    case "league_position":
      return locale === "fr"
        ? `@${p.by_username ?? "Un joueur"} t'a dépassé au classement (#${p.new_rank ?? "?"}).`
        : `@${p.by_username ?? "A player"} overtook you in the standings (#${p.new_rank ?? "?"}).`;
    case "match_kickoff": {
      const home = locale === "fr" ? p.home_fr : p.home_en;
      const away = locale === "fr" ? p.away_fr : p.away_en;
      if (home && away)
        return locale === "fr"
          ? `⏰ Pronostique ${home}–${away} avant le coup d'envoi !`
          : `⏰ Predict ${home}–${away} before kickoff!`;
      return locale === "fr"
        ? "⏰ Un match arrive — pronostique avant le coup d'envoi !"
        : "⏰ A match is coming up — predict before kickoff!";
    }
    case "match_result": {
      const score = `${p.home_score ?? 0}–${p.away_score ?? 0}`;
      return locale === "fr"
        ? `🏁 Un match que tu suis est terminé — score final ${score}.`
        : `🏁 A match you follow has ended — final score ${score}.`;
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
      return "/leagues";
    case "daily_challenge":
      return typeof p.link === "string" && p.link ? p.link : "/news";
    case "reaction_received":
      return p.match_id ? `/matches/${p.match_id}` : null;
    case "comment_received":
      return p.match_id ? `/matches/${p.match_id}` : "/leagues";
    case "league_position":
      return "/leaderboard/global";
    case "match_kickoff":
      return p.match_id ? `/matches/${p.match_id}` : "/predict";
    case "match_result":
      return p.match_id ? `/matches/${p.match_id}` : null;
    default:
      return null;
  }
}
