"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { signOut } from "@/lib/auth/actions";
import {
  ChevronDown,
  Receipt,
  ShieldCheck,
  LogOut,
  Languages,
  HelpCircle,
  LifeBuoy,
  User,
  UserRound,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Props = {
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    role: "player" | "admin" | "super_admin";
    balance_cents: number;
  };
  locale: Locale;
};

export function UserMenu({ user, locale }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const initials = (user.display_name ?? user.username)
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isAdmin = user.role === "admin" || user.role === "super_admin";

  function switchLocale() {
    const next: Locale = locale === "fr" ? "en" : "fr";
    router.replace(pathname, { locale: next });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex items-center gap-2.5 rounded-[8px] border border-white/[0.12] bg-white/[0.06] py-1 pl-1 pr-3 text-sm transition",
          "hover:border-primary-500/35 hover:bg-primary-500/[0.08]",
          open && "border-primary-500/35 bg-primary-500/[0.08]",
        )}
      >
        <Avatar initials={initials} src={user.avatar_url} />
        <span className="hidden text-sm font-medium leading-tight text-text-primary sm:block">
          {user.display_name ?? user.username}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-text-tertiary transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-[8px] border border-white/[0.12] bg-surface-1/[0.94] shadow-2xl shadow-black/40 backdrop-blur-xl"
        >
          {/* User card */}
          <div className="border-b border-white/[0.08] px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar initials={initials} src={user.avatar_url} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-text-primary">
                  {user.display_name ?? user.username}
                </div>
                <div className="truncate text-xs text-text-tertiary">
                  @{user.username}
                </div>
              </div>
              {isAdmin && (
                <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-400 ring-1 ring-gold-500/30">
                  {user.role === "super_admin" ? "Super" : "Admin"}
                </span>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <MenuItem
              href="/profile"
              icon={UserRound}
              label={locale === "fr" ? "Mon profil" : "My profile"}
              onClick={() => setOpen(false)}
            />
            <MenuItem
              href="/invite"
              icon={UserPlus}
              label={locale === "fr" ? "Inviter des amis" : "Invite friends"}
              onClick={() => setOpen(false)}
            />
            <MenuItem
              href="/bets"
              icon={Receipt}
              label={locale === "fr" ? "Mes paris" : "My bets"}
              onClick={() => setOpen(false)}
            />
            <MenuItem
              href="/dashboard"
              icon={User}
              label={locale === "fr" ? "Mon dashboard" : "My dashboard"}
              onClick={() => setOpen(false)}
            />
            <MenuItem
              href="/how-it-works"
              icon={HelpCircle}
              label={locale === "fr" ? "Comment ça marche" : "How it works"}
              onClick={() => setOpen(false)}
            />
            <MenuItem
              href="/support"
              icon={LifeBuoy}
              label={locale === "fr" ? "Support" : "Support"}
              onClick={() => setOpen(false)}
            />
            {isAdmin && (
              <MenuItem
                href="/admin"
                icon={ShieldCheck}
                label="Admin"
                onClick={() => setOpen(false)}
                accent
              />
            )}
          </div>

          {/* Language + logout */}
          <div className="border-t border-white/[0.08] py-1">
            <button
              type="button"
              role="menuitem"
              onClick={switchLocale}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-text-secondary transition hover:bg-white/[0.05] hover:text-text-primary"
            >
              <Languages className="size-4" strokeWidth={1.5} />
              <span className="flex-1 text-left">
                {locale === "fr" ? "Switch to English" : "Passer en français"}
              </span>
              <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] uppercase text-text-tertiary">
                {locale === "fr" ? "EN" : "FR"}
              </span>
            </button>
            <form
              action={async () => {
                await signOut();
              }}
            >
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-text-secondary transition hover:bg-error/10 hover:text-error"
              >
                <LogOut className="size-4" strokeWidth={1.5} />
                <span>{locale === "fr" ? "Se déconnecter" : "Sign out"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({
  initials,
  src,
  size = "sm",
}: {
  initials: string;
  src: string | null;
  size?: "sm" | "lg";
}) {
  const dim = size === "sm" ? "size-7" : "size-10";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn(dim, "rounded-full object-cover ring-1 ring-border-subtle")}
      />
    );
  }
  return (
    <div
      className={cn(
        dim,
        "flex items-center justify-center rounded-full bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-mono text-[11px] font-semibold uppercase text-text-primary ring-1 ring-border-subtle",
      )}
    >
      {initials || "?"}
    </div>
  );
}

function MenuItem({
  href,
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  href: string;
  icon: typeof UserRound;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className={cn(
        "flex items-center gap-3 px-4 py-2 text-sm transition",
        accent
          ? "text-gold-400 hover:bg-gold-500/10"
          : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
      )}
    >
      <Icon className="size-4" strokeWidth={1.5} />
      <span>{label}</span>
    </Link>
  );
}
