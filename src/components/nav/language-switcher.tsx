"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Compact FR | EN toggle. Switches locale on the current path while keeping
 * the user where they are (next-intl rewrites the locale prefix).
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();
  const current = (params?.locale as Locale) ?? routing.defaultLocale;

  return (
    <div
      role="group"
      aria-label="Langue / Language"
      className={cn(
        "inline-flex items-center rounded-sm border border-white/[0.12] bg-white/[0.05] p-0.5",
        className,
      )}
    >
      {routing.locales.map((l) => {
        const active = l === current;
        return (
          <button
            key={l}
            type="button"
            aria-pressed={active}
            disabled={isPending}
            onClick={() => {
              if (active) return;
              startTransition(() => {
                router.replace(pathname, { locale: l });
              });
            }}
            className={cn(
              "rounded-[5px] px-2 py-1 text-[11px] font-bold uppercase tracking-wider transition disabled:opacity-60",
              active
                ? "bg-primary-500 text-abyss shadow-glow-primary"
                : "text-text-tertiary hover:text-text-primary",
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
