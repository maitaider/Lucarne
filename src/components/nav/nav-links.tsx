"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  CalendarDays,
  ChevronDown,
  Crown,
  LayoutDashboard,
  Newspaper,
  Radio,
  Receipt,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Child = {
  href: string;
  icon: LucideIcon;
  fr: string;
  en: string;
  body?: { fr: string; en: string };
};

type Top = {
  /** Primary destination when the parent itself is clicked. */
  href: string;
  fr: string;
  en: string;
  icon: LucideIcon;
  children?: Child[];
};

/**
 * Top-level nav: max 4 entries. Each parent (except Accueil) opens a
 * dropdown with its sub-pages. A parent is highlighted whenever any of
 * its children match the current path.
 */
const NAV: Top[] = [
  {
    href: "/dashboard",
    fr: "Accueil",
    en: "Home",
    icon: LayoutDashboard,
  },
  {
    href: "/predict",
    fr: "Tournoi",
    en: "Tournament",
    icon: Trophy,
    children: [
      {
        href: "/predict",
        icon: Sparkles,
        fr: "Pronostique",
        en: "Predict",
        body: {
          fr: "Groupes + phase finale + pronos par match, en une page",
          en: "Groups + bracket + per-match picks, one page",
        },
      },
      {
        href: "/matches",
        icon: CalendarDays,
        fr: "Calendrier",
        en: "Calendar",
        body: {
          fr: "Les 104 matchs, groupes, arbre",
          en: "All 104 fixtures, groups, bracket",
        },
      },
    ],
  },
  {
    href: "/live",
    fr: "Live",
    en: "Live",
    icon: Radio,
    children: [
      {
        href: "/live",
        icon: Radio,
        fr: "Scores",
        en: "Scores",
        body: {
          fr: "Matchs en direct + résultats du jour",
          en: "Live + today's results",
        },
      },
      {
        href: "/news",
        icon: Newspaper,
        fr: "Actus",
        en: "News",
        body: {
          fr: "News officielles & analyses",
          en: "Official news & analysis",
        },
      },
    ],
  },
  {
    href: "/leaderboard/global",
    fr: "Communauté",
    en: "Community",
    icon: Users,
    children: [
      {
        href: "/leaderboard/global",
        icon: Crown,
        fr: "Classement",
        en: "Leaderboard",
        body: {
          fr: "Podium global + cagnotte projetée",
          en: "Global podium + projected pot",
        },
      },
      {
        href: "/leagues",
        icon: Users,
        fr: "Mes ligues",
        en: "My leagues",
        body: {
          fr: "Espaces privés entre amis",
          en: "Private friend rooms",
        },
      },
      {
        href: "/bets",
        icon: Receipt,
        fr: "Mes paris",
        en: "My bets",
        body: {
          fr: "Historique de tes paris réglés",
          en: "Your settled bets history",
        },
      },
    ],
  },
];

export function NavLinks({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <nav
      className="hidden items-center gap-1 md:flex"
      aria-label="Primary"
    >
      {NAV.map((item) => {
        const isActive = matchesParent(pathname, item);
        if (!item.children) {
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
        }
        return (
          <DropdownItem
            key={item.href}
            item={item}
            isActive={isActive}
            currentPath={pathname}
            locale={locale}
          />
        );
      })}
    </nav>
  );
}

/** A parent is "active" when the current pathname starts with any child's href. */
function matchesParent(pathname: string, top: Top): boolean {
  if (pathname === top.href || pathname.startsWith(`${top.href}/`)) return true;
  for (const c of top.children ?? []) {
    if (pathname === c.href || pathname.startsWith(`${c.href}/`)) return true;
  }
  return false;
}

function DropdownItem({
  item,
  isActive,
  currentPath,
  locale,
}: {
  item: Top;
  isActive: boolean;
  currentPath: string;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside closes the menu.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // Close when route changes.
  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  const Icon = item.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-sm transition",
          isActive
            ? "border-primary-500/30 bg-primary-500/[0.12] text-primary-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "border-transparent text-text-secondary hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-text-primary",
        )}
      >
        <Icon className="size-4" strokeWidth={1.5} />
        <span>{locale === "fr" ? item.fr : item.en}</span>
        <ChevronDown
          className={cn(
            "size-3 transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-1 w-[min(320px,90vw)] -translate-x-1/2 overflow-hidden rounded-[12px] border border-white/[0.12] bg-abyss/95 p-1.5 shadow-2xl backdrop-blur-xl"
        >
          <ul className="space-y-0.5">
            {item.children?.map((c) => {
              const ChildIcon = c.icon;
              const childActive =
                currentPath === c.href ||
                currentPath.startsWith(`${c.href}/`);
              return (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    role="menuitem"
                    className={cn(
                      "flex items-start gap-3 rounded-[8px] px-2.5 py-2 text-sm transition",
                      childActive
                        ? "bg-primary-500/[0.12] text-primary-300"
                        : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
                    )}
                  >
                    <ChildIcon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        childActive
                          ? "text-primary-300"
                          : "text-text-tertiary",
                      )}
                      strokeWidth={1.8}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold leading-5">
                        {locale === "fr" ? c.fr : c.en}
                      </div>
                      {c.body && (
                        <div className="mt-0.5 text-xs leading-4 text-text-tertiary">
                          {locale === "fr" ? c.body.fr : c.body.en}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
