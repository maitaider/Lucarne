"use client";

import { useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { addComment, deleteComment } from "@/lib/social/actions";
import { useToast } from "@/components/ui/toast-provider";
import { Loader2, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { CommentRow } from "@/lib/social/queries";

type Props = {
  parentType: "match" | "bet" | "league_feed";
  parentId: string;
  comments: CommentRow[];
  currentUserId: string | null;
  locale: Locale;
  emptyLabel?: string;
};

export function CommentThread({
  parentType,
  parentId,
  comments,
  currentUserId,
  locale,
  emptyLabel,
}: Props) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (!currentUserId) {
      toast.error(
        locale === "fr"
          ? "Connecte-toi pour commenter."
          : "Sign in to comment.",
      );
      return;
    }
    startTransition(async () => {
      const res = await addComment({
        parent_type: parentType,
        parent_id: parentId,
        body: text,
      });
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteComment(id);
      if (res.ok) router.refresh();
      else toast.error(res.message ?? "Erreur");
    });
  }

  const remaining = 280 - body.length;

  return (
    <div className="space-y-3">
      {currentUserId && (
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] p-2.5 backdrop-blur-xl focus-within:border-primary-500/40"
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={280}
            rows={2}
            placeholder={
              locale === "fr"
                ? "Donne ton avis sur ce match…"
                : "Share your take on this match…"
            }
            className="flex-1 resize-none rounded-md bg-transparent px-2 py-1 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums",
                remaining < 30
                  ? remaining < 0
                    ? "text-error"
                    : "text-gold-400"
                  : "text-text-tertiary",
              )}
            >
              {remaining}
            </span>
            <button
              type="submit"
              disabled={isPending || body.trim().length === 0}
              className={cn(
                "inline-flex items-center gap-1 rounded-[8px] px-3 py-1.5 text-xs font-bold transition",
                body.trim().length > 0 && !isPending
                  ? "bg-primary-500 text-abyss hover:bg-primary-400"
                  : "bg-white/[0.06] text-text-tertiary",
              )}
            >
              {isPending ? (
                <Loader2 className="size-3 animate-spin" strokeWidth={2} />
              ) : (
                <Send className="size-3" strokeWidth={2} />
              )}
              {locale === "fr" ? "Envoyer" : "Send"}
            </button>
          </div>
        </form>
      )}

      {comments.length === 0 ? (
        <p className="text-center text-xs text-text-tertiary">
          {emptyLabel ??
            (locale === "fr"
              ? "Sois le premier à réagir."
              : "Be the first to chime in.")}
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-[10px] border border-white/[0.06] bg-surface-1/[0.4] p-3 backdrop-blur-xl"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    initials={(c.author.display_name ?? c.author.username)
                      .split(/\s+/)
                      .map((s) => s[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/u/${c.author.username}`}
                      className="truncate text-xs font-semibold text-text-primary transition hover:text-primary-400 hover:underline"
                    >
                      {c.author.display_name ?? `@${c.author.username}`}
                    </Link>
                    <span className="ml-2 text-[10px] text-text-tertiary">
                      {formatRelativeTime(c.created_at, locale)}
                    </span>
                  </div>
                </div>
                {currentUserId === c.user_id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    aria-label={locale === "fr" ? "Supprimer" : "Delete"}
                    className="text-text-tertiary transition hover:text-error"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.7} />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-mono text-[10px] font-bold uppercase text-text-primary ring-1 ring-white/[0.1]">
      {initials || "?"}
    </span>
  );
}

function formatRelativeTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.round(diff / 60_000);
  const hr = Math.round(diff / 3_600_000);
  const day = Math.round(diff / 86_400_000);
  if (min < 1) return locale === "fr" ? "à l'instant" : "just now";
  if (min < 60) return locale === "fr" ? `${min} min` : `${min}m`;
  if (hr < 24) return locale === "fr" ? `${hr} h` : `${hr}h`;
  if (day < 7) return locale === "fr" ? `${day} j` : `${day}d`;
  return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "short",
  });
}
