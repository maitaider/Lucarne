"use client";

import { useState } from "react";
import { Share2, Check, Loader2, MessagesSquare } from "lucide-react";
import { postChatMessage } from "@/lib/chat/actions";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Shares a public prediction (`/{locale}/p/{betId}`): the native share sheet /
 * clipboard, plus a one-tap "post to the Salon" that drops the link in the
 * global chat (it renders there as a "View prediction" chip).
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
  const [salon, setSalon] = useState<"idle" | "posting" | "done">("idle");
  const toast = useToast();

  function shareUrl() {
    return `${window.location.origin}/${locale}/p/${betId}`;
  }

  async function handleShare() {
    const url = shareUrl();
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

  async function handleSalon() {
    if (salon !== "idle") return;
    setSalon("posting");
    const body = `${fr ? "Mon prono" : "My prediction"} 👉 ${shareUrl()}`;
    const res = await postChatMessage(body, locale);
    if (res.ok) {
      setSalon("done");
      toast.success(fr ? "Partagé dans le Salon ⚽" : "Shared to the Lounge ⚽");
      setTimeout(() => setSalon("idle"), 3000);
    } else {
      setSalon("idle");
      toast.error(res.message);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/[0.14] bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary-500/45 hover:bg-primary-500/[0.1] active:scale-[0.99]"
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
      <button
        type="button"
        onClick={handleSalon}
        disabled={salon === "posting"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-violet-500/30 bg-violet-500/[0.1] px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:border-violet-500/50 hover:bg-violet-500/[0.16] active:scale-[0.99] disabled:opacity-60"
      >
        {salon === "posting" ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={2} />
        ) : salon === "done" ? (
          <Check className="size-4 text-primary-400" strokeWidth={2.2} />
        ) : (
          <MessagesSquare className="size-4" strokeWidth={1.8} />
        )}
        {salon === "done"
          ? fr
            ? "Partagé ✓"
            : "Shared ✓"
          : fr
            ? "Partager dans le Salon"
            : "Share to the Lounge"}
      </button>
    </div>
  );
}
