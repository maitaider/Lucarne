"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

const items = [
  { href: "/dashboard", icon: LayoutDashboard, fr: "Dashboard", en: "Dashboard" },
  { href: "/picks", icon: Sparkles, fr: "Pronos", en: "Picks" },
  { href: "/matches", icon: CalendarDays, fr: "Matchs", en: "Matches" },
  { href: "/bets", icon: Receipt, fr: "Mes paris", en: "My bets" },
  { href: "/leagues", icon: Users, fr: "Ligues", en: "Leagues" },
] as const;

export function MobileMenu({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={locale === "fr" ? "Ouvrir le menu" : "Open menu"}
        className="flex size-9 items-center justify-center rounded-[8px] border border-white/[0.12] bg-white/[0.06] text-text-secondary transition hover:border-primary-500/35 hover:text-text-primary md:hidden"
      >
        <Menu className="size-4" strokeWidth={1.5} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] md:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-abyss/80 backdrop-blur-md"
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 right-0 flex w-[80%] max-w-[320px] flex-col border-l border-white/[0.1] bg-surface-1/[0.96] shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
              <span className="font-display text-base font-semibold text-text-primary">
                {locale === "fr" ? "Menu" : "Menu"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={locale === "fr" ? "Fermer" : "Close"}
                className="flex size-8 items-center justify-center rounded-[8px] text-text-secondary hover:bg-white/[0.05] hover:text-text-primary"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile primary">
              {items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[8px] px-3 py-3 text-sm transition",
                      isActive
                        ? "bg-primary-500/[0.12] text-primary-400"
                        : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.5} />
                    <span className="font-medium">
                      {locale === "fr" ? item.fr : item.en}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
