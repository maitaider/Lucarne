"use client";

import { useState, useTransition } from "react";
import { setMatchFollow } from "@/lib/matches/follow-actions";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import { Bell, BellRing } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/**
 * Toggle to follow a match (add it to your calendar + get notified). Optimistic.
 *  - variant "icon": compact bell for match cards.
 *  - variant "full": labelled pill for the match detail page.
 */
export function FollowMatchButton({
  matchId,
  initialFollowing,
  locale,
  variant = "icon",
  className,
}: {
  matchId: string;
  initialFollowing: boolean;
  locale: Locale;
  variant?: "icon" | "full";
  className?: string;
}) {
  const fr = locale === "fr";
  const toast = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    const next = !following;
    setFollowing(next); // optimistic
    startTransition(async () => {
      const res = await setMatchFollow(matchId, next);
      if (!res.ok) {
        setFollowing(!next);
        toast.error(fr ? "Action impossible." : "Couldn't update.");
      } else {
        toast.success(
          next
            ? fr
              ? "Match ajouté à ton calendrier"
              : "Match added to your calendar"
            : fr
              ? "Match retiré"
              : "Match removed",
        );
      }
    });
  }

  const Icon = following ? BellRing : Bell;
  const label = following
    ? fr
      ? "Suivi"
      : "Following"
    : fr
      ? "Suivre"
      : "Follow";

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={following}
        title={
          following
            ? fr
              ? "Ne plus suivre ce match"
              : "Unfollow this match"
            : fr
              ? "Suivre ce match (calendrier + notif)"
              : "Follow this match (calendar + notify)"
        }
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50",
          following
            ? "border-primary-500/45 bg-primary-500/[0.16] text-primary-200 hover:bg-primary-500/[0.22]"
            : "border-white/[0.14] bg-white/[0.05] text-text-secondary hover:border-white/[0.25] hover:text-text-primary",
          className,
        )}
      >
        <Icon className="size-4" strokeWidth={2} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      aria-label={
        following
          ? fr
            ? "Ne plus suivre ce match"
            : "Unfollow this match"
          : fr
            ? "Suivre ce match"
            : "Follow this match"
      }
      title={
        following
          ? fr
            ? "Suivi — clique pour retirer"
            : "Following — click to remove"
          : fr
            ? "Suivre (calendrier + notif)"
            : "Follow (calendar + notify)"
      }
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50",
        following
          ? "border-primary-500/45 bg-primary-500/[0.16] text-primary-300"
          : "border-white/[0.12] bg-white/[0.04] text-text-tertiary hover:border-white/[0.25] hover:text-text-secondary",
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={2} />
    </button>
  );
}
