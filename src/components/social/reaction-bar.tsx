"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleReaction, type ReactionKind } from "@/lib/social/actions";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

type Props = {
  targetType: "bet" | "comment";
  targetId: string;
  initialCounts: Record<ReactionKind, number>;
  initialMine: ReactionKind[];
  size?: "sm" | "md";
};

const EMOJI: Record<ReactionKind, string> = {
  fire: "🔥",
  clap: "👏",
  laugh: "😂",
  think: "🤔",
  shock: "😱",
  skull: "💀",
};

const ORDER: ReactionKind[] = ["fire", "clap", "laugh", "think", "shock", "skull"];

type ReactionState = {
  counts: Record<ReactionKind, number>;
  mine: ReactionKind[];
};

export function ReactionBar({
  targetType,
  targetId,
  initialCounts,
  initialMine,
  size = "md",
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [base, setBase] = useState<ReactionState>({
    counts: initialCounts,
    mine: initialMine,
  });
  const toast = useToast();

  const [optimistic, applyOptimistic] = useOptimistic(
    base,
    (state, reaction: ReactionKind) => {
      const hadIt = state.mine.includes(reaction);
      const nextMine = hadIt
        ? state.mine.filter((r) => r !== reaction)
        : [...state.mine, reaction];
      const nextCounts = {
        ...state.counts,
        [reaction]: Math.max(state.counts[reaction] + (hadIt ? -1 : 1), 0),
      };
      return { counts: nextCounts, mine: nextMine };
    },
  );

  function handleClick(reaction: ReactionKind) {
    startTransition(async () => {
      applyOptimistic(reaction);
      const res = await toggleReaction({
        target_type: targetType,
        target_id: targetId,
        reaction,
      });
      if (res.ok) {
        setBase({ counts: res.reactions, mine: res.mine });
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {ORDER.map((kind) => {
        const count = optimistic.counts[kind];
        const isMine = optimistic.mine.includes(kind);
        const visible = count > 0 || isMine || size === "md";
        if (!visible) return null;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => handleClick(kind)}
            disabled={isPending}
            aria-pressed={isMine}
            aria-label={`Réagir ${kind}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border transition",
              size === "sm"
                ? "px-1.5 py-0.5 text-[11px]"
                : "px-2 py-1 text-xs",
              isMine
                ? "border-primary-500/45 bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/30"
                : count > 0
                  ? "border-white/[0.12] bg-white/[0.06] text-text-secondary hover:border-white/[0.2] hover:text-text-primary"
                  : "border-transparent bg-transparent text-text-tertiary opacity-60 hover:border-white/[0.12] hover:bg-white/[0.04] hover:opacity-100",
              isPending && "cursor-not-allowed opacity-60",
            )}
          >
            <span aria-hidden className="leading-none">
              {EMOJI[kind]}
            </span>
            {count > 0 && (
              <span className="font-mono tabular-nums">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
