import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  UserRound,
  ShieldCheck,
  Trophy,
  Target,
  Sparkles,
  Percent,
  History,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Minus,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/profile/queries";
import {
  getPublicProfile,
  getProfileRecentBets,
  type ProfileBet,
  type ProfileTeamSide,
} from "@/lib/profile/public-profile";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { SectionPanel } from "@/components/layout/section-panel";
import { Flag } from "@/components/team/flag";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  // A null profile means "not found OR not a viewable co-member" — 404 for both
  // so a non-member can't probe which usernames exist.
  const [profile, me] = await Promise.all([
    getPublicProfile(username),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const recent = await getProfileRecentBets(username, 8);

  const isSelf = me?.id === profile.user_id;
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";
  const initials = (profile.display_name || profile.username)
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const successPct =
    profile.settled_count > 0
      ? Math.round((profile.wins / profile.settled_count) * 100)
      : null;
  const draws = Math.max(
    profile.settled_count - profile.wins - profile.losses,
    0,
  );

  return (
    <AppPageShell width="wide">
      <div>
        <Link
          href="/leaderboard/global"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition hover:text-text-primary"
        >
          <ArrowLeft className="size-4" />
          {fr ? "Classement" : "Leaderboard"}
        </Link>
      </div>

      {/* ── Profile header ───────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden rounded-sm border border-white/[0.13] bg-abyss/[0.8] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-7">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_30%_0%,rgba(34,217,130,0.10),transparent_62%)]"
        />
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
          <ProfileAvatar
            url={profile.avatar_url}
            initials={initials}
            isAdmin={isAdmin}
          />
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "mb-2 inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                isAdmin
                  ? "border-gold-500/35 bg-gold-500/[0.1] text-gold-300 shadow-glow-gold"
                  : "border-primary-500/35 bg-primary-500/[0.1] text-primary-300 shadow-glow-primary",
              )}
            >
              <UserRound className="size-3.5" strokeWidth={1.7} />
              {fr ? "Profil joueur" : "Player profile"}
            </div>
            <h1 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
              <span className="min-w-0 break-words">
                {profile.display_name || `@${profile.username}`}
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold-300 ring-1 ring-gold-500/30">
                  <ShieldCheck className="size-3" strokeWidth={2.5} />
                  Admin
                </span>
              )}
              {isSelf && (
                <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-400">
                  {fr ? "Toi" : "You"}
                </span>
              )}
            </h1>
            {profile.display_name && (
              <p className="mt-1 font-mono text-sm text-text-tertiary">
                @{profile.username}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile
            icon={Trophy}
            accent="gold"
            label={fr ? "Rang global" : "Global rank"}
            value={`#${profile.rank}`}
          />
          <StatTile
            icon={Sparkles}
            accent="primary"
            label="Points"
            value={profile.total_points}
          />
          <StatTile
            icon={Target}
            label={fr ? "Pronostics" : "Predictions"}
            value={profile.bets_count}
          />
          <StatTile
            icon={Percent}
            label={fr ? "Réussite" : "Win rate"}
            value={successPct === null ? "—" : `${successPct}%`}
            sub={`${profile.wins}${fr ? "V" : "W"} · ${draws}${fr ? "N" : "D"} · ${profile.losses}${fr ? "D" : "L"}`}
          />
        </div>
      </section>

      {/* ── Recent predictions (validated + settled) ─────────────────────── */}
      <SectionPanel
        icon={History}
        accent="violet"
        title={fr ? "Derniers pronostics" : "Latest predictions"}
        badge={recent.length || undefined}
      >
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-tertiary">
            {fr
              ? "Aucun pronostic pour le moment."
              : "No predictions yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((bet) => (
              <RecentBetRow key={bet.bet_id} bet={bet} locale={L} />
            ))}
          </ul>
        )}
      </SectionPanel>
    </AppPageShell>
  );
}

/* ───────────────────────────── Header pieces ─────────────────────────────── */

function ProfileAvatar({
  url,
  initials,
  isAdmin,
}: {
  url: string | null;
  initials: string;
  isAdmin: boolean;
}) {
  const ring = isAdmin ? "ring-gold-500/45" : "ring-white/[0.14]";
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn(
          "size-16 shrink-0 rounded-full object-cover ring-2 sm:size-20",
          ring,
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-display text-2xl font-bold uppercase text-text-primary ring-2 sm:size-20",
        ring,
      )}
    >
      {initials || "?"}
    </span>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: "gold" | "primary";
}) {
  const tone =
    accent === "gold"
      ? "text-gold-300"
      : accent === "primary"
        ? "text-primary-300"
        : "text-text-secondary";
  return (
    <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        <Icon className={cn("size-3", tone)} strokeWidth={2} />
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold tabular-nums text-text-primary">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 font-mono text-[10px] tabular-nums text-text-tertiary">
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Recent bet pieces ───────────────────────────── */

function RecentBetRow({ bet, locale }: { bet: ProfileBet; locale: Locale }) {
  const fr = locale === "fr";
  const hasMatch =
    bet.match_id !== null && (bet.home.name_fr !== null || bet.away.name_fr !== null);
  const predicted = parseScore(bet.payload);

  const inner = (
    <div className="flex items-center gap-3 rounded-sm border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 transition hover:border-white/[0.12] hover:bg-white/[0.045]">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {hasMatch ? (
          <>
            <Flag isoCode={bet.home.iso} size="sm" />
            <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-text-primary">
              {teamName(bet.home, fr)}
            </span>
            <span className="shrink-0 font-display text-sm font-bold tabular-nums text-text-secondary">
              {fmtScore(bet.home.score)}
              <span className="mx-0.5 text-text-tertiary">:</span>
              {fmtScore(bet.away.score)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
              {teamName(bet.away, fr)}
            </span>
            <Flag isoCode={bet.away.iso} size="sm" />
          </>
        ) : (
          <span className="truncate text-sm font-semibold text-text-primary">
            {betTypeLabel(bet.bet_type, fr)}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {predicted && (
          <span className="hidden rounded-full border border-white/10 px-2 py-0.5 text-[11px] tabular-nums text-text-tertiary sm:inline">
            {fr ? "Prono" : "Pick"} {predicted.home}–{predicted.away}
          </span>
        )}
        <ResultBadge
          result={bet.result}
          points={bet.points}
          matchStatus={bet.match_status}
          fr={fr}
        />
      </div>
    </div>
  );

  if (bet.match_id) {
    return (
      <li>
        <Link href={`/matches/${bet.match_id}`} className="block">
          {inner}
        </Link>
      </li>
    );
  }
  return <li>{inner}</li>;
}

function ResultBadge({
  result,
  points,
  matchStatus,
  fr,
}: {
  result: string | null;
  points: number;
  matchStatus: string | null;
  fr: boolean;
}) {
  if (result === "won") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary-300 ring-1 ring-primary-500/25">
        <CheckCircle2 className="size-3" strokeWidth={2.5} />+{points} pts
      </span>
    );
  }
  if (result === "lost") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-error ring-1 ring-error/25">
        <XCircle className="size-3" strokeWidth={2.5} />
        {points} {fr ? "pt" : "pt"}
      </span>
    );
  }
  // No result yet: a locked-in pick on a not-finished match is upcoming/live,
  // not a 0-point draw.
  if (result === null && matchStatus !== "finished") {
    const live = matchStatus === "live";
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/12 px-2 py-0.5 text-[11px] font-bold text-violet-300 ring-1 ring-violet-500/25">
        <Clock className="size-3" strokeWidth={2.5} />
        {live ? (fr ? "En cours" : "Live") : fr ? "À venir" : "Upcoming"}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-tertiary">
      <Minus className="size-3" strokeWidth={2.5} />
      {points} pts
    </span>
  );
}

/* ───────────────────────────────── Helpers ───────────────────────────────── */

function teamName(t: ProfileTeamSide, fr: boolean): string {
  return (fr ? t.name_fr : t.name_en) ?? t.fifa ?? "?";
}

function fmtScore(s: number | null): string {
  return s === null ? "–" : String(s);
}

function parseScore(payload: unknown): { home: number; away: number } | null {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.home === "number" && typeof p.away === "number") {
      return { home: p.home, away: p.away };
    }
  }
  return null;
}

function betTypeLabel(t: string, fr: boolean): string {
  const map: Record<string, { fr: string; en: string }> = {
    exact_score: { fr: "Score exact", en: "Exact score" },
    anytime_scorer: { fr: "Buteur", en: "Goalscorer" },
    match_winner: { fr: "Vainqueur du match", en: "Match winner" },
    tournament_winner: { fr: "Vainqueur du tournoi", en: "Tournament winner" },
    top_scorer: { fr: "Meilleur buteur", en: "Top scorer" },
  };
  return map[t]?.[fr ? "fr" : "en"] ?? t;
}
