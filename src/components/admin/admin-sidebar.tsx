"use client";

import { Link, usePathname } from "@/i18n/navigation";
import {
  Calculator,
  Coins,
  Goal,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessagesSquare,
  ScrollText,
  Settings,
  Shirt,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

const ITEMS: {
  href: string;
  icon: LucideIcon;
  fr: string;
  en: string;
  badge?: string;
}[] = [
  { href: "/admin", icon: LayoutDashboard, fr: "Vue d'ensemble", en: "Overview" },
  { href: "/admin/payments", icon: Wallet, fr: "Paiements", en: "Payments" },
  { href: "/admin/economy", icon: Coins, fr: "Économie", en: "Economy" },
  { href: "/admin/players", icon: Shirt, fr: "Effectifs", en: "Rosters" },
  { href: "/admin/matches", icon: Goal, fr: "Résultats", en: "Results" },
  { href: "/admin/scoring", icon: Calculator, fr: "Barème", en: "Scoring" },
  { href: "/admin/users", icon: Users, fr: "Usagers", en: "Users" },
  { href: "/admin/chat", icon: MessagesSquare, fr: "Salon", en: "Lounge" },
  { href: "/admin/support", icon: LifeBuoy, fr: "Support", en: "Support" },
  { href: "/admin/broadcast", icon: Megaphone, fr: "Diffusion", en: "Broadcast" },
  { href: "/admin/audit", icon: ScrollText, fr: "Audit", en: "Audit" },
  { href: "/admin/settings", icon: Settings, fr: "Réglages", en: "Settings" },
];

export function AdminSidebar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  return (
    <nav className="lg:sticky lg:top-20 lg:self-start" aria-label="Admin">
      <ul className="flex gap-1 overflow-x-auto rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] p-1 backdrop-blur-xl lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-2">
        {ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition lg:w-full",
                  isActive
                    ? "bg-gold-500/[0.12] text-gold-200 shadow-[inset_0_0_0_1px_rgba(245,196,71,0.3)]"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-gold-300" : "text-text-tertiary",
                  )}
                  strokeWidth={1.7}
                />
                <span className="truncate font-medium">
                  {locale === "fr" ? item.fr : item.en}
                </span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300 ring-1 ring-primary-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
