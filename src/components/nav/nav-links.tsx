"use client";

import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Receipt,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

const items = [
  { href: "/dashboard", icon: LayoutDashboard, fr: "Dashboard", en: "Dashboard" },
  { href: "/bracket", icon: Trophy, fr: "Bracket", en: "Bracket" },
  { href: "/picks", icon: Sparkles, fr: "Pronos", en: "Picks" },
  { href: "/matches", icon: CalendarDays, fr: "Matchs", en: "Matches" },
  { href: "/bets", icon: Receipt, fr: "Paris", en: "Bets" },
  { href: "/leagues", icon: Users, fr: "Ligues", en: "Leagues" },
] as const;

export function NavLinks({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-sm transition",
              isActive
                ? "border-primary-500/30 bg-primary-500/[0.12] text-primary-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-transparent text-text-secondary hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-text-primary",
            )}
          >
            <Icon className="size-4" strokeWidth={1.5} />
            <span>{locale === "fr" ? item.fr : item.en}</span>
          </Link>
        );
      })}
    </nav>
  );
}
