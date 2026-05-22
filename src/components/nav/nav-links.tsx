"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { LayoutDashboard, CalendarDays, Receipt, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

const items = [
  { href: "/dashboard", icon: LayoutDashboard, fr: "Dashboard", en: "Dashboard" },
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
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
              isActive
                ? "bg-surface-2/80 text-text-primary"
                : "text-text-secondary hover:bg-surface-1/60 hover:text-text-primary",
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
