"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  CalendarDays,
  Crown,
  LayoutDashboard,
  Menu,
  Newspaper,
  Radio,
  Receipt,
  Sparkles,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Item = { href: string; icon: LucideIcon; fr: string; en: string };

/** Mirror of the desktop nav, expanded to flat groups for mobile clarity. */
const GROUPS: Array<{
  fr: string;
  en: string;
  items: Item[];
}> = [
  {
    fr: "Accueil",
    en: "Home",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, fr: "Dashboard", en: "Dashboard" },
    ],
  },
  {
    fr: "Tournoi",
    en: "Tournament",
    items: [
      { href: "/bracket", icon: Trophy, fr: "Mon scénario", en: "My scenario" },
      { href: "/picks", icon: Sparkles, fr: "Mes pronos", en: "My picks" },
      { href: "/matches", icon: CalendarDays, fr: "Calendrier", en: "Calendar" },
    ],
  },
  {
    fr: "Live",
    en: "Live",
    items: [
      { href: "/live", icon: Radio, fr: "Scores", en: "Scores" },
      { href: "/news", icon: Newspaper, fr: "Actus", en: "News" },
    ],
  },
  {
    fr: "Communauté",
    en: "Community",
    items: [
      { href: "/leaderboard/global", icon: Crown, fr: "Classement", en: "Leaderboard" },
      { href: "/leagues", icon: Users, fr: "Mes ligues", en: "My leagues" },
      { href: "/bets", icon: Receipt, fr: "Mes paris", en: "My bets" },
    ],
  },
];

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
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-abyss/80 backdrop-blur-md"
          />
          <div className="absolute inset-y-0 right-0 flex w-[85%] max-w-[340px] flex-col border-l border-white/[0.1] bg-surface-1/[0.96] shadow-2xl shadow-black/40 backdrop-blur-xl">
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
            <nav
              className="flex-1 space-y-5 overflow-y-auto p-3"
              aria-label="Mobile primary"
            >
              {GROUPS.map((g) => (
                <section key={g.fr}>
                  <h3 className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                    {locale === "fr" ? g.fr : g.en}
                  </h3>
                  <ul className="space-y-0.5">
                    {g.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm transition",
                              isActive
                                ? "bg-primary-500/[0.12] text-primary-300"
                                : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
                            )}
                          >
                            <Icon className="size-4" strokeWidth={1.5} />
                            <span className="font-medium">
                              {locale === "fr" ? item.fr : item.en}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
