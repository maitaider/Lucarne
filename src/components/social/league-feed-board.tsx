"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  publishLeaguePost,
  deleteLeaguePost,
} from "@/lib/social/league-actions";
import { useToast } from "@/components/ui/toast-provider";
import { Loader2, Send, Trash2, MessageCircle, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { LeaguePost } from "@/lib/social/league-feed";

export function LeagueFeedBoard({
  leagueId,
  initialPosts,
  currentUserId,
  isAdmin,
  locale,
}: {
  leagueId: string;
  initialPosts: LeaguePost[];
  currentUserId: string | null;
  isAdmin: boolean;
  locale: Locale;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"message" | "announcement">("message");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // Realtime: new posts
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`league_feed:${leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "league_posts",
          filter: `league_id=eq.${leagueId}`,
        },
        async (payload) => {
          const row = payload.new as { id?: string };
          if (!row?.id) return;
          // Refresh from server to get the joined author info
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [leagueId, router]);

  // Sync when server returns new initialPosts
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (!currentUserId) {
      toast.error(
        locale === "fr"
          ? "Connecte-toi pour écrire."
          : "Sign in to post.",
      );
      return;
    }
    startTransition(async () => {
      const res = await publishLeaguePost({
        league_id: leagueId,
        body: text,
        kind,
      });
      if (res.ok) {
        setBody("");
        setKind("message");
        toast.success(
          locale === "fr" ? "Message envoyé !" : "Message posted!",
        );
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteLeaguePost(id);
      if (res.ok) {
        setPosts((p) => p.filter((x) => x.id !== id));
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  const remaining = 1000 - body.length;

  return (
    <section className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.55] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-text-primary">
          <MessageCircle className="size-4 text-primary-400" strokeWidth={1.7} />
          {locale === "fr" ? "Mur de la ligue" : "League wall"}
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {posts.length} {locale === "fr" ? "messages" : "messages"}
        </span>
      </header>

      {/* Composer */}
      {currentUserId && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-2 border-b border-white/[0.08] p-4"
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={
              locale === "fr"
                ? "Quoi de neuf dans la ligue ?"
                : "What's up in the league?"
            }
            className="w-full resize-none rounded-[8px] border border-white/[0.1] bg-abyss/[0.5] px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-500/50"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isAdmin && (
                <label className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <input
                    type="checkbox"
                    checked={kind === "announcement"}
                    onChange={(e) =>
                      setKind(e.target.checked ? "announcement" : "message")
                    }
                    className="size-3.5 accent-gold-500"
                  />
                  <Megaphone className="size-3 text-gold-300" strokeWidth={2} />
                  {locale === "fr" ? "Annonce épinglée" : "Pinned announcement"}
                </label>
              )}
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  remaining < 100
                    ? remaining < 0
                      ? "text-error"
                      : "text-gold-400"
                    : "text-text-tertiary",
                )}
              >
                {remaining}
              </span>
            </div>
            <button
              type="submit"
              disabled={isPending || body.trim().length === 0}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-bold transition",
                body.trim().length > 0 && !isPending
                  ? "bg-primary-500 text-abyss hover:bg-primary-400"
                  : "bg-white/[0.06] text-text-tertiary",
              )}
            >
              {isPending ? (
                <Loader2 className="size-3 animate-spin" strokeWidth={2} />
              ) : (
                <Send className="size-3" strokeWidth={2.5} />
              )}
              {locale === "fr" ? "Publier" : "Post"}
            </button>
          </div>
        </form>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="p-6 text-center text-sm text-text-secondary">
          {locale === "fr"
            ? "Aucun message pour le moment. Lance la discussion !"
            : "No messages yet. Start the conversation!"}
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {posts.map((p) => (
            <FeedPostCard
              key={p.id}
              post={p}
              currentUserId={currentUserId}
              locale={locale}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FeedPostCard({
  post,
  currentUserId,
  locale,
  onDelete,
}: {
  post: LeaguePost;
  currentUserId: string | null;
  locale: Locale;
  onDelete: () => void;
}) {
  const initials = (post.author.display_name ?? post.author.username)
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isMine = currentUserId === post.author_id;
  const isAnnouncement = post.kind === "announcement";
  return (
    <li
      className={cn(
        "px-4 py-3 transition hover:bg-white/[0.025]",
        isAnnouncement && "bg-gold-500/[0.04]",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/30 to-violet-500/15 font-mono text-[11px] font-bold uppercase text-text-primary ring-1 ring-white/[0.1]">
          {initials || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-text-primary">
              {post.author.display_name ?? `@${post.author.username}`}
            </span>
            {isAnnouncement && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300 ring-1 ring-gold-500/30">
                <Megaphone className="size-2.5" strokeWidth={2.5} />
                {locale === "fr" ? "Annonce" : "Announcement"}
              </span>
            )}
            <span className="font-mono text-[10px] tabular-nums text-text-tertiary">
              {relative(post.created_at, locale)}
            </span>
            {isMine && (
              <button
                type="button"
                onClick={onDelete}
                aria-label={locale === "fr" ? "Supprimer" : "Delete"}
                className="ml-auto text-text-tertiary transition hover:text-error"
              >
                <Trash2 className="size-3" strokeWidth={1.7} />
              </button>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {post.body}
          </p>
        </div>
      </div>
    </li>
  );
}

function relative(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const diff = Math.max(Date.now() - d.getTime(), 0);
  const min = Math.round(diff / 60_000);
  if (min < 1) return locale === "fr" ? "à l'instant" : "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(diff / 3_600_000);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(diff / 86_400_000);
  if (day < 7) return locale === "fr" ? `${day} j` : `${day}d`;
  return d.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    day: "2-digit",
    month: "short",
  });
}
