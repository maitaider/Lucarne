"use client";

import { useRealtimeBalance } from "@/lib/hooks/use-realtime-balance";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Reactive balance pill — subscribes to realtime updates of public.profiles
 * for the current user and flashes when the value changes.
 */
export function LiveBalance({
  userId,
  initialCents,
  locale,
  className,
}: {
  userId: string | null;
  initialCents: number;
  locale: Locale;
  className?: string;
}) {
  const balanceCents = useRealtimeBalance(userId, initialCents);
  const tokens = Math.floor(balanceCents / 100);
  const prevRef = useRef(tokens);
  const [flash, setFlash] = useState<"none" | "up" | "down">("none");
  const toast = useToast();

  useEffect(() => {
    if (prevRef.current === tokens) return;
    const diff = tokens - prevRef.current;
    prevRef.current = tokens;
    setFlash(diff >= 0 ? "up" : "down");
    if (diff !== 0) {
      toast.success(
        locale === "fr"
          ? `Solde mis à jour : ${diff > 0 ? "+" : ""}${diff} jetons`
          : `Balance updated: ${diff > 0 ? "+" : ""}${diff} tokens`,
      );
    }
    const id = window.setTimeout(() => setFlash("none"), 1500);
    return () => clearTimeout(id);
  }, [tokens, locale, toast]);

  return (
    <div className={cn("text-right", className)}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {locale === "fr" ? "Solde" : "Balance"}
      </div>
      <div
        className={cn(
          "font-display text-3xl font-bold tabular-nums transition-colors",
          flash === "up"
            ? "text-primary-300"
            : flash === "down"
              ? "text-error"
              : "text-primary-400",
        )}
      >
        {tokens.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA")}
        <span className="ml-1 text-xs font-medium text-text-secondary">
          {locale === "fr" ? "jetons" : "tokens"}
        </span>
      </div>
    </div>
  );
}
