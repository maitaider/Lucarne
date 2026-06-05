"use client";

import { Flag } from "@/components/team/flag";
import type { ChatLiveMatch } from "@/lib/chat/queries";
import type { Locale } from "@/i18n/routing";

export const WATCH_REACTIONS = ["⚽", "🔥", "😱", "👏", "❌", "🟥", "😂", "💪"];

/**
 * Watch-party bar: shows live match scores (updated via realtime) + a row of
 * one-tap reactions that float up the salon (ephemeral broadcast, no throttle).
 */
export function LiveMatchBar({
  matches,
  locale,
  onReact,
}: {
  matches: ChatLiveMatch[];
  locale: Locale;
  onReact: (emoji: string) => void;
}) {
  const fr = locale === "fr";
  if (matches.length === 0) return null;
  return (
    <div className="shrink-0 border-b border-error/25 bg-gradient-to-r from-error/[0.1] via-error/[0.04] to-transparent px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-error/70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-error" />
          </span>
          {fr ? "En direct" : "Live"}
        </span>
        {matches.map((m) => {
          const home = (fr ? m.home_name_fr : m.home_name_en) ?? "?";
          const away = (fr ? m.away_name_fr : m.away_name_en) ?? "?";
          return (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary"
            >
              <Flag isoCode={m.home_iso} size="xs" className="shrink-0" />
              <span className="hidden sm:inline">{home}</span>
              <span className="rounded bg-abyss/50 px-1.5 font-mono tabular-nums">
                {m.home_score ?? 0}–{m.away_score ?? 0}
              </span>
              <span className="hidden sm:inline">{away}</span>
              <Flag isoCode={m.away_iso} size="xs" className="shrink-0" />
            </span>
          );
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {WATCH_REACTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onReact(e)}
            aria-label={`React ${e}`}
            className="flex size-7 items-center justify-center rounded-full bg-white/[0.05] text-base transition hover:scale-125 hover:bg-white/[0.1] active:scale-95"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
