"use client";

import { Link, usePathname } from "@/i18n/navigation";
import {
  CalendarDays,
  Crown,
  LayoutDashboard,
  MessagesSquare,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatUnread } from "@/components/chat/chat-unread";
import type { Locale } from "@/i18n/routing";

type Tab = { href: string; icon: LucideIcon; fr: string; en: string };

// The 5 "hot" surfaces consulted on a phone during matches — thumb-reachable.
// Icons mirror the desktop header nav. Pronostiquer stays one tap away via the
// floating FAB + the header menu (kept deliberately off the bar to keep 5 tabs).
const TABS: Tab[] = [
  { href: "/dashboard", icon: LayoutDashboard, fr: "Accueil", en: "Home" },
  { href: "/live", icon: Radio, fr: "Live", en: "Live" },
  { href: "/matches", icon: CalendarDays, fr: "Calendrier", en: "Calendar" },
  { href: "/leaderboard/global", icon: Crown, fr: "Classement", en: "Ranking" },
  { href: "/chat", icon: MessagesSquare, fr: "Salon", en: "Lounge" },
];

/**
 * Fixed bottom tab bar — the PRIMARY mobile navigation (`md:hidden`; desktop
 * keeps the header `NavLinks`). Frosted glass consistent with the header
 * (abyss + backdrop-blur, palette tokens only). Secondary routes (profile,
 * notifications, rules, admin) stay in the header (menu + bell + avatar).
 *
 * - Salon badge: shared `useChatUnread` store (single realtime channel — safe
 *   to mount alongside the desktop NavLinks badge).
 * - Live pip: server-computed `hasLiveMatch` (from React.cache'd listMatches).
 */
export function BottomNav({
  locale,
  userId,
  hasLiveMatch,
}: {
  locale: Locale;
  userId: string | null;
  hasLiveMatch: boolean;
}) {
  const pathname = usePathname();
  const chatUnread = useChatUnread(userId);
  const fr = locale === "fr";

  // The salon is a full-screen, keyboard-driven surface — a fixed bottom bar
  // fights the composer + the on-screen keyboard. Hide it there.
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return null;

  return (
    <nav
      aria-label={fr ? "Navigation principale" : "Primary navigation"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-abyss/[0.85] pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {TABS.map((t) => {
          const active =
            pathname === t.href || pathname.startsWith(`${t.href}/`);
          const Icon = t.icon;
          const badge = t.href === "/chat" ? chatUnread : 0;
          const live = t.href === "/live" && hasLiveMatch;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-1 transition-colors",
                  active
                    ? "text-primary-300"
                    : "text-text-tertiary hover:text-text-secondary",
                )}
              >
                {/* active indicator */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-[28%] top-0 h-0.5 rounded-full bg-primary-400 shadow-[0_0_10px_rgba(34,217,130,0.6)]"
                  />
                )}
                <span className="relative">
                  <Icon
                    className="size-[22px]"
                    strokeWidth={active ? 2.2 : 1.7}
                  />
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-500 px-1 font-mono text-[9px] font-bold text-abyss ring-2 ring-abyss">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  {live && (
                    <span
                      aria-label={fr ? "En direct" : "Live"}
                      className="absolute -right-1.5 -top-1 flex size-2.5"
                    >
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-violet-400 ring-2 ring-abyss" />
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold leading-none">
                  {fr ? t.fr : t.en}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
