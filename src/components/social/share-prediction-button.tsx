"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Shares the public link to a settled/locked prediction (`/{locale}/p/{betId}`).
 * Uses the native share sheet when available, else copies the link. The URL is
 * built from `window.location.origin` so it works on any deploy without env.
 */
export function SharePredictionButton({
  betId,
  locale,
  className,
}: {
  betId: string;
  locale: Locale;
  className?: string;
}) {
  const fr = locale === "fr";
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/${locale}/p/${betId}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: fr ? "Mon pronostic Lucarne" : "My Lucarne prediction",
          url,
        });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/[0.14] bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary-500/45 hover:bg-primary-500/[0.1] active:scale-[0.99]",
        className,
      )}
    >
      {copied ? (
        <Check className="size-4 text-primary-400" strokeWidth={2.2} />
      ) : (
        <Share2 className="size-4" strokeWidth={1.8} />
      )}
      {copied
        ? fr
          ? "Lien copié"
          : "Link copied"
        : fr
          ? "Partager"
          : "Share"}
    </button>
  );
}
