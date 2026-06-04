"use client";

import { BarChart3, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatPoll } from "@/lib/chat/queries";
import type { Locale } from "@/i18n/routing";

export function PollCard({
  poll,
  locale,
  onVote,
}: {
  poll: ChatPoll;
  locale: Locale;
  onVote: (pollId: string, idx: number) => void;
}) {
  const fr = locale === "fr";
  const total = poll.total;
  const voted = poll.my_vote !== null;
  return (
    <div className="mt-1 max-w-md rounded-[12px] border border-violet-500/25 bg-violet-500/[0.06] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
        <BarChart3 className="size-4 shrink-0 text-violet-300" strokeWidth={2} />
        {poll.question}
      </p>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const c = poll.counts[i] ?? 0;
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          const mine = poll.my_vote === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onVote(poll.id, i)}
              className={cn(
                "relative block w-full overflow-hidden rounded-[8px] border px-2.5 py-1.5 text-left text-sm transition",
                mine
                  ? "border-violet-500/50 text-text-primary"
                  : "border-white/[0.1] text-text-secondary hover:border-violet-500/40 hover:text-text-primary",
              )}
            >
              {voted && (
                <span
                  className="absolute inset-y-0 left-0 bg-violet-500/15 transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  {mine && (
                    <Check className="size-3.5 shrink-0 text-violet-300" strokeWidth={2.5} />
                  )}
                  {opt}
                </span>
                {voted && (
                  <span className="font-mono text-xs tabular-nums text-text-tertiary">
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-text-tertiary">
        {total} {fr ? (total > 1 ? "votes" : "vote") : total === 1 ? "vote" : "votes"}
        {!voted && total === 0 ? (fr ? " · sois le premier" : " · be the first") : ""}
      </p>
    </div>
  );
}
