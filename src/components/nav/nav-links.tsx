"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  CalendarDays,
  ChevronDown,
  Crown,
  LayoutDashboard,
  MessagesSquare,
  Newspaper,
  Radio,
  Receipt,
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
  /** Destination when the label itself is clicked (always 1 click). */
  href: string;
  fr: string;
  en: string;
  icon: LucideIcon;
  /** Optional related pages, revealed by the chevron. */
  children?: Child[];
};

/**
 * Top-level nav: 4 entries, each a real LINK (the label navigates in one
 * click). Sections with related pages get a chevron that opens a small
 * menu — clicking the chevron never navigates, clicking the label never
 * opens the menu, so the two intents never collide.
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
    fr: "Pronostics",
    en: "Predict",
    icon: Trophy,
  },
  {
    href: "/matches",
    fr: "Calendrier",
    en: "Calendar",
    icon: CalendarDays,
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
        href: "/chat",
        icon: MessagesSquare,
        fr: "Salon",
        en: "Lounge",
        body: {
          fr: "Tchat du groupe en temps réel",
          en: "Realtime group chat",
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

function shellClasses(isActive: boolean): string {
  return cn(
    "relative flex items-center rounded-full border text-sm transition duration-200",
    isActive
      ? "border-primary-500/40 bg-primary-500/15 text-primary-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(34,217,130,0.12)]"
      : "border-transparent text-text-secondary hover:border-white/[0.1] hover:bg-white/[0.06] hover:text-text-primary",
  );
}

export function NavLinks({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
      {NAV.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={matchesParent(pathname, item)}
          currentPath={pathname}
          locale={locale}
        />
      ))}
    </nav>
  );
}

/** A parent is "active" when the path matches it or any of its children. */
function matchesParent(pathname: string, top: Top): boolean {
  if (pathname === top.href || pathname.startsWith(`${top.href}/`)) return true;
  for (const c of top.children ?? []) {
    if (pathname === c.href || pathname.startsWith(`${c.href}/`)) return true;
  }
  return false;
}

function NavItem({
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
  const Icon = item.icon;
  const label = locale === "fr" ? item.fr : item.en;

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

  // Close whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className={cn(shellClasses(isActive), "gap-1.5 px-3 py-1.5")}
      >
        <Icon className="size-4" strokeWidth={1.5} />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <div ref={ref} className={shellClasses(isActive)}>
      <Link
        href={item.href}
        className="flex items-center gap-1.5 py-1.5 pl-3 pr-1.5"
      >
        <Icon className="size-4" strokeWidth={1.5} />
        <span>{label}</span>
      </Link>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          locale === "fr" ? `${label} — plus d'options` : `${label} — more`
        }
        className="flex items-center py-1.5 pl-0.5 pr-2 opacity-70 transition hover:opacity-100"
      >
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1.5 w-[min(320px,90vw)] overflow-hidden rounded-md border border-border-strong/60 bg-surface-2 p-1.5 shadow-raised"
        >
          <ul className="space-y-0.5">
            {item.children.map((c) => {
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
                      "flex items-start gap-3 rounded-sm px-2.5 py-2 text-sm transition",
                      childActive
                        ? "bg-primary-500/[0.12] text-primary-300"
                        : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
                    )}
                  >
                    <ChildIcon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        childActive ? "text-primary-300" : "text-text-tertiary",
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
