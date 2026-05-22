"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useQuickBet, type QuickBetMatch } from "@/components/bet/quick-bet-provider";
import { Flag } from "@/components/team/flag";
import {
  WorldTrophyMark,
  TerminalGridMark,
  OrbitBallMark,
  StadiumBeamMark,
} from "@/components/brand/sport-icons";
import {
  Activity,
  ArrowRight,
  Network,
  Radio,
  Trophy,
  Zap,
} from "lucide-react";
import { useRealtimeActivity, type ActivityEvent } from "@/lib/hooks/use-realtime-activity";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export type PredictionTicket = {
  match: QuickBetMatch;
  label: string;
  stage: string;
  venue: string;
  time: string;
  accent: "primary" | "gold" | "violet" | "emerald";
  /** community % shares for home/draw/away (0-100, sums ~100) */
  shares: [number, number, number];
  /** decimal odds, computed from shares */
  odds: [number, number, number];
};

export type BracketCell = {
  stageKey: "r32" | "r16" | "qf";
  homeCode: string | null;
  awayCode: string | null;
};

export type StandingRow = {
  rank: number;
  name: string;
  wins: number;
  points: number;
  isMe?: boolean;
};

/* ============================================================================
   Main cockpit panel — the right-hand "Console live" frame
   ============================================================================ */

type CockpitTab = "standings" | "bracket" | "activity";

export function Cockpit({
  locale,
  tickets,
  standings,
  bracket,
  rings,
  donutValue,
  donutLabel,
  formPoints,
}: {
  locale: Locale;
  tickets: PredictionTicket[];
  standings: StandingRow[];
  bracket: BracketCell[][];
  rings: { label: string; value: number; color: "primary" | "gold" | "violet" }[];
  donutValue: number;
  donutLabel: string;
  formPoints: number[];
}) {
  const [tab, setTab] = useState<CockpitTab>("standings");
  const events = useRealtimeActivity();

  return (
    <div className="relative rounded-[12px] border border-white/[0.16] bg-white/[0.045] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      <span
        aria-hidden
        className="pointer-events-none absolute left-12 right-12 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />
      <div className="grid gap-3 md:grid-cols-[2.75rem_1fr]">
        <ConsoleRail tab={tab} setTab={setTab} locale={locale} />
        <div className="rounded-[10px] border border-black/30 bg-abyss/[0.7] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <ConsoleHeader locale={locale} events={events} />
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {tickets.map((t) => (
              <PredictionCard key={t.match.id} ticket={t} locale={locale} />
            ))}
          </div>

          <CockpitTabs current={tab} onChange={setTab} locale={locale} />

          {tab === "standings" && (
            <div className="mt-3">
              <MiniStandings locale={locale} rows={standings} />
            </div>
          )}
          {tab === "bracket" && (
            <div className="mt-3">
              <MiniBracket locale={locale} columns={bracket} />
            </div>
          )}
          {tab === "activity" && (
            <div className="mt-3">
              <ActivityTicker events={events} locale={locale} />
            </div>
          )}

          <div className="mt-3 grid gap-3 xl:grid-cols-[0.85fr_1.25fr_0.9fr]">
            <ProgressDonut value={donutValue} label={donutLabel} locale={locale} />
            <FormCurve points={formPoints} locale={locale} />
            <MetricRings rings={rings} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   Tabs + live ticker
   ============================================================================ */

function CockpitTabs({
  current,
  onChange,
  locale,
}: {
  current: CockpitTab;
  onChange: (t: CockpitTab) => void;
  locale: Locale;
}) {
  const tabs: { key: CockpitTab; icon: typeof Trophy; fr: string; en: string }[] = [
    { key: "standings", icon: Trophy, fr: "Classement", en: "Leaderboard" },
    { key: "bracket", icon: Network, fr: "Organigramme", en: "Bracket" },
    { key: "activity", icon: Activity, fr: "Activité live", en: "Live activity" },
  ];

  return (
    <div className="mt-3 inline-flex rounded-[10px] border border-white/[0.08] bg-white/[0.04] p-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = current === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-primary-500 text-abyss shadow-glow-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Icon className="size-3.5" strokeWidth={2} />
            {locale === "fr" ? t.fr : t.en}
            {t.key === "activity" && (
              <span className="relative ml-0.5 flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-violet-400" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ActivityTicker({
  events,
  locale,
}: {
  events: ActivityEvent[];
  locale: Locale;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-[8px] border border-white/[0.06] bg-abyss/[0.4] p-6 text-center">
        <Radio className="mx-auto mb-2 size-4 text-violet-300" strokeWidth={1.7} />
        <p className="text-xs text-text-secondary">
          {locale === "fr"
            ? "Écoute des paris, paiements et coups d'envoi en temps réel…"
            : "Listening for bets, payments, and kickoffs in real time…"}
        </p>
        <p className="mt-1 text-[10px] text-text-tertiary">
          {locale === "fr"
            ? "Les événements apparaîtront ici dès qu'ils se produisent."
            : "Events appear here the moment they happen."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {events.map((ev) => {
        const accent =
          ev.kind === "bet_placed"
            ? "border-primary-500/30 bg-primary-500/[0.06]"
            : ev.kind === "payment"
              ? "border-gold-500/30 bg-gold-500/[0.06]"
              : "border-violet-500/30 bg-violet-500/[0.06]";
        return (
          <li
            key={ev.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-xs",
              accent,
            )}
          >
            <span className="text-text-primary">{ev.message}</span>
            <span className="font-mono text-[10px] tabular-nums text-text-tertiary">
              {formatTickerTime(ev.createdAt, locale)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function formatTickerTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const diff = Math.max(Date.now() - d.getTime(), 0);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return locale === "fr" ? "à l'instant" : "just now";
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  return d.toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ============================================================================
   Sub-components
   ============================================================================ */

function ConsoleRail({
  tab,
  setTab,
  locale,
}: {
  tab: CockpitTab;
  setTab: (t: CockpitTab) => void;
  locale: Locale;
}) {
  const items: {
    key: string;
    Icon: typeof OrbitBallMark;
    target: CockpitTab | "matches" | "leagues";
    tone: string;
    activeTone: string;
    labelFr: string;
    labelEn: string;
  }[] = [
    {
      key: "ball",
      Icon: OrbitBallMark,
      target: "matches",
      tone: "text-text-secondary",
      activeTone: "text-primary-300",
      labelFr: "Calendrier des matchs",
      labelEn: "Match calendar",
    },
    {
      key: "stadium",
      Icon: StadiumBeamMark,
      target: "activity",
      tone: "text-text-secondary",
      activeTone: "text-violet-300",
      labelFr: "Activité live",
      labelEn: "Live activity",
    },
    {
      key: "terminal",
      Icon: TerminalGridMark,
      target: "standings",
      tone: "text-text-secondary",
      activeTone: "text-primary-300",
      labelFr: "Classement",
      labelEn: "Leaderboard",
    },
    {
      key: "trophy",
      Icon: WorldTrophyMark,
      target: "bracket",
      tone: "text-text-secondary",
      activeTone: "text-gold-300",
      labelFr: "Organigramme",
      labelEn: "Bracket",
    },
  ];

  return (
    <div className="hidden flex-col items-center gap-2 rounded-[8px] border border-white/[0.08] bg-abyss/[0.5] py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:flex">
      {items.map(({ key, Icon, target, tone, activeTone, labelFr, labelEn }) => {
        const active = target === tab;
        const label = locale === "fr" ? labelFr : labelEn;

        // External nav for matches/leagues, tab switch for cockpit views
        if (target === "matches" || target === "leagues") {
          return (
            <Link
              key={key}
              href={`/${target}`}
              aria-label={label}
              title={label}
              className={cn(
                "group relative flex size-9 cursor-pointer items-center justify-center rounded-[8px] border border-white/[0.08] bg-white/[0.035] transition hover:border-white/[0.2] hover:bg-white/[0.08]",
                tone,
                "hover:text-text-primary",
              )}
            >
              <Icon className="size-5" />
              <RailTooltip label={label} />
            </Link>
          );
        }

        return (
          <button
            key={key}
            type="button"
            onClick={() => setTab(target)}
            aria-label={label}
            title={label}
            aria-pressed={active}
            className={cn(
              "group relative flex size-9 cursor-pointer items-center justify-center rounded-[8px] border transition",
              active
                ? "border-primary-500/50 bg-primary-500/[0.16] shadow-glow-primary"
                : "border-white/[0.08] bg-white/[0.035] hover:border-white/[0.2] hover:bg-white/[0.08]",
              active ? activeTone : tone,
              "hover:text-text-primary",
            )}
          >
            <Icon className="size-5" />
            <RailTooltip label={label} />
          </button>
        );
      })}
      <span
        aria-hidden
        className="mt-1 h-12 w-1 rounded-full bg-gradient-to-b from-primary-400 via-gold-400 to-violet-400"
      />
    </div>
  );
}

function RailTooltip({ label }: { label: string }) {
  return (
    <span
      className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/[0.1] bg-abyss/95 px-2 py-1 text-[10px] font-semibold text-text-primary opacity-0 shadow-lg transition group-hover:opacity-100"
      role="tooltip"
    >
      {label}
    </span>
  );
}

function ConsoleHeader({
  locale,
  events,
}: {
  locale: Locale;
  events: ActivityEvent[];
}) {
  const recent = events[0];
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-[8px] border border-primary-500/25 bg-primary-500/[0.1] text-primary-400">
          <TerminalGridMark className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            {locale === "fr" ? "Console live" : "Live console"}
            <span className="ml-1.5 inline-flex items-center gap-1 text-violet-300">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-violet-400" />
              </span>
              {locale === "fr" ? "branché" : "online"}
            </span>
          </p>
          <p className="truncate text-sm font-semibold text-text-primary">
            {recent
              ? recent.message
              : locale === "fr"
                ? "Vue tactique du tournoi"
                : "Tournament tactical view"}
          </p>
        </div>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {events.length} {locale === "fr" ? "événements" : "events"}
        </span>
        <span className="size-1.5 rounded-full bg-primary-400" />
        <span className="size-1.5 rounded-full bg-gold-400" />
        <span className="size-1.5 rounded-full bg-violet-400" />
      </div>
    </div>
  );
}

function PredictionCard({
  ticket,
  locale,
}: {
  ticket: PredictionTicket;
  locale: Locale;
}) {
  const quickBet = useQuickBet();
  const accentBorder = {
    primary: "border-primary-500/25 from-primary-500/[0.12]",
    gold: "border-gold-500/30 from-gold-500/[0.12]",
    violet: "border-violet-500/25 from-violet-500/[0.12]",
    emerald: "border-emerald-500/25 from-emerald-500/[0.12]",
  }[ticket.accent];

  const homeCode = ticket.match.home_team?.iso_code?.toUpperCase().slice(0, 3) ?? "TBD";
  const awayCode = ticket.match.away_team?.iso_code?.toUpperCase().slice(0, 3) ?? "TBD";

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    quickBet.open(ticket.match);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group block overflow-hidden rounded-[10px] border bg-gradient-to-br p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-0.5 hover:border-primary-500/45 hover:bg-white/[0.045]",
        accentBorder,
        "to-white/[0.025]",
      )}
    >
      <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        <span className="truncate">{ticket.label}</span>
        <span className="font-mono tabular-nums text-text-secondary">
          {ticket.time}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <SidePill
          iso={ticket.match.home_team?.iso_code ?? null}
          code={homeCode}
          align="left"
        />
        <span className="font-mono text-[10px] font-bold uppercase text-text-tertiary">
          vs
        </span>
        <SidePill
          iso={ticket.match.away_team?.iso_code ?? null}
          code={awayCode}
          align="right"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {(["primary", "gold", "violet"] as const).map((tone, idx) => {
          const share = ticket.shares[idx];
          const odds = ticket.odds[idx];
          const barColor =
            tone === "primary"
              ? "bg-primary-400"
              : tone === "gold"
                ? "bg-gold-400"
                : "bg-violet-400";
          return (
            <div key={idx}>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.max(share, 4)}%` }}
                />
              </div>
              <p className="mt-1 font-mono text-[10px] tabular-nums text-text-secondary">
                {odds.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px]">
        <p className="truncate text-text-tertiary transition group-hover:text-text-secondary">
          {ticket.venue}
        </p>
        <span className="font-bold text-primary-400 opacity-0 transition group-hover:opacity-100">
          {locale === "fr" ? "Pronostiquer →" : "Quick bet →"}
        </span>
      </div>
    </button>
  );
}

function SidePill({
  iso,
  code,
  align,
}: {
  iso: string | null;
  code: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        align === "right" && "justify-end",
      )}
    >
      {align === "left" && <Flag isoCode={iso} size="md" />}
      <span className="truncate font-mono text-[10px] font-bold uppercase text-text-primary">
        {code}
      </span>
      {align === "right" && <Flag isoCode={iso} size="md" />}
    </div>
  );
}

function MiniStandings({
  locale,
  rows,
}: {
  locale: Locale;
  rows: StandingRow[];
}) {
  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-abyss/[0.38] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Trophy className="size-4 text-gold-400" strokeWidth={1.7} />
          {locale === "fr" ? "Tableau de classement" : "Leaderboard"}
        </h3>
        <Link
          href="/leaderboard/global"
          className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary transition hover:text-gold-400"
        >
          {locale === "fr" ? "Ouvrir" : "Open"}
        </Link>
      </div>
      <div className="overflow-hidden rounded-[8px] border border-white/[0.06]">
        {rows.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-text-tertiary">
            {locale === "fr" ? "Classement à venir" : "Standings coming soon"}
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={`${row.rank}-${row.name}`}
              className={cn(
                "grid grid-cols-[2.5rem_1fr_3rem_3rem] items-center gap-2 border-b border-white/[0.055] bg-white/[0.025] px-2.5 py-2 last:border-b-0",
                row.isMe && "bg-primary-500/[0.08]",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-[8px] font-display text-sm font-bold ring-1",
                  row.rank === 1
                    ? "bg-gold-500/15 text-gold-400 ring-gold-500/30"
                    : row.rank <= 3
                      ? "bg-primary-500/15 text-primary-400 ring-primary-500/25"
                      : "bg-white/[0.05] text-text-tertiary ring-white/[0.07]",
                )}
              >
                {row.rank}
              </span>
              <span className="truncate text-xs font-semibold text-text-primary">
                {row.name}
                {row.isMe && (
                  <span className="ml-1.5 rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-400">
                    {locale === "fr" ? "Toi" : "You"}
                  </span>
                )}
              </span>
              <span className="font-mono text-xs tabular-nums text-text-secondary">
                {row.wins}V
              </span>
              <span className="text-right font-display text-sm font-semibold tabular-nums text-text-primary">
                {row.points}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MiniBracket({
  locale,
  columns,
}: {
  locale: Locale;
  columns: BracketCell[][];
}) {
  const stageLabels: Record<BracketCell["stageKey"], { fr: string; en: string }> = {
    r32: { fr: "1/16ᵉ", en: "R32" },
    r16: { fr: "8ᵉ", en: "R16" },
    qf: { fr: "Quarts", en: "QF" },
  };

  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/[0.08] bg-abyss/[0.38] p-3">
      <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 md:block">
        <div className="flex size-14 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/[0.08] shadow-glow-gold">
          <WorldTrophyMark className="size-8 text-gold-400" />
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Network className="size-4 text-primary-400" strokeWidth={1.7} />
          {locale === "fr" ? "Organigramme final" : "Final bracket"}
        </h3>
        <Link
          href="/matches?view=knockout"
          className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary transition hover:text-primary-400"
        >
          {locale === "fr" ? "Arbre" : "Bracket"}
        </Link>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[460px] items-stretch gap-3 pr-16">
          {columns.map((column, idx) => (
            <div key={idx} className="flex flex-1 flex-col">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                {stageLabels[column[0]?.stageKey ?? "r32"][locale]}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-2">
                {column.map((cell, i) => (
                  <BracketNode key={i} cell={cell} locale={locale} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BracketNode({
  cell,
  locale,
}: {
  cell: BracketCell;
  locale: Locale;
}) {
  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-white/[0.035] px-2.5 py-2 text-[10px]">
      <div className="truncate font-semibold text-text-primary">
        {cell.homeCode ?? (locale === "fr" ? "À déterminer" : "TBD")}
      </div>
      <div className="truncate text-text-tertiary">
        {cell.awayCode ?? (locale === "fr" ? "À déterminer" : "TBD")}
      </div>
    </div>
  );
}

function ProgressDonut({
  value,
  label,
  locale,
}: {
  value: number;
  label: string;
  locale: Locale;
}) {
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-abyss/[0.38] p-3">
      <div className="mb-3 h-1.5 w-14 rounded-full bg-white/[0.18]" />
      <div className="flex items-center gap-4">
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#22d982 ${clamped}%, rgba(255,255,255,0.08) 0)`,
          }}
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-abyss">
            <span className="font-display text-sm font-semibold text-text-primary">
              {clamped}%
            </span>
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary-400" />
            <span className="text-[10px] text-text-tertiary">
              {locale === "fr" ? "Groupes" : "Groups"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-gold-400" />
            <span className="text-[10px] text-text-tertiary">
              {locale === "fr" ? "Phase finale" : "Knockout"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-violet-400" />
            <span className="text-[10px] text-text-tertiary">Live</span>
          </div>
          <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function FormCurve({
  points,
  locale,
}: {
  points: number[];
  locale: Locale;
}) {
  // Normalize points to 0-1 then map to SVG coords (96px high, 320px wide)
  const safe = points.length > 0 ? points : [0, 0, 0, 0, 0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = Math.max(max - min, 1);
  const stepX = 320 / Math.max(safe.length - 1, 1);
  const path = safe
    .map((p, i) => {
      const x = i * stepX;
      const y = 96 - ((p - min) / range) * 76 - 8;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L320 96 L0 96 Z`;

  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-abyss/[0.38] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-1.5 w-16 rounded-full bg-white/[0.18]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {locale === "fr" ? "Forme" : "Form"}
        </span>
      </div>
      <svg viewBox="0 0 320 96" className="h-24 w-full overflow-visible">
        <defs>
          <linearGradient id="form-area" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#22d982" stopOpacity="0.42" />
            <stop offset="1" stopColor="#22d982" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#form-area)" />
        <path
          d={path}
          fill="none"
          stroke="#22d982"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Decorative dashed second line */}
        <path
          d={path}
          fill="none"
          stroke="#f5c447"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeLinecap="round"
          opacity="0.5"
          transform="translate(0, 18)"
        />
      </svg>
    </div>
  );
}

function MetricRings({
  rings,
}: {
  rings: { label: string; value: number; color: "primary" | "gold" | "violet" }[];
}) {
  const colors = {
    primary: "#22d982",
    gold: "#f5c447",
    violet: "#7c5cff",
  };
  return (
    <div className="grid grid-cols-3 gap-2 rounded-[8px] border border-white/[0.08] bg-abyss/[0.38] p-3">
      {rings.map((r) => {
        const clamped = Math.max(0, Math.min(r.value, 100));
        return (
          <div key={r.label} className="flex flex-col items-center justify-center gap-2">
            <div
              className="flex size-14 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(${colors[r.color]} ${clamped}%, rgba(255,255,255,0.08) 0)`,
              }}
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-abyss">
                <span className="font-mono text-[10px] font-bold tabular-nums text-text-primary">
                  {clamped}
                </span>
              </div>
            </div>
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {r.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================================
   Exported "Mode trophée" left-rail card (reused in the page header)
   ============================================================================ */

export function TrophyModeCard({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-[10px] border border-gold-500/25 bg-abyss/[0.55] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-gold-500/35 bg-gold-500/[0.08] text-gold-400 shadow-glow-gold">
          <WorldTrophyMark className="size-9" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
            {locale === "fr" ? "Mode trophée" : "Trophy mode"}
          </p>
          <p className="mt-1 text-sm leading-5 text-text-secondary">
            {locale === "fr"
              ? "Suis tes prochains coups d'envoi et défie tes amis sur l'ensemble du tournoi."
              : "Track every kickoff and challenge your friends across the tournament."}
          </p>
          <Link
            href="/matches"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold-400 transition hover:text-gold-300"
          >
            {locale === "fr" ? "Ouvrir le calendrier" : "Open the calendar"}
            <ArrowRight className="size-3" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
