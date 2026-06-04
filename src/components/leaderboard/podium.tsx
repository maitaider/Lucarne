import type { StandingEntry } from "@/lib/leagues/queries";
import { Crown, Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatMoney } from "@/lib/admin/economy";

type PayoutInfo = {
  /** Projected cents for each rank (index 0 = #1, index 1 = #2, …). */
  payouts: number[];
  /** Currency code, e.g. "CAD". */
  currency: string;
  /** Locale used for the money formatter — e.g. "fr-CA" / "en-CA". */
  locale: string;
};

// Legibility helper — usernames sit over a translucent gradient, so every name
// gets a soft dark shadow + a bright, rank-tinted colour (gold / white / bronze).
const NAME_SHADOW = "[text-shadow:0_1px_3px_rgba(0,0,0,0.75)]";

export function LeaderboardPodium({
  top3,
  payouts,
}: {
  top3: StandingEntry[];
  payouts?: PayoutInfo;
}) {
  const [first, second, third] = [top3[0], top3[1], top3[2]];
  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/[0.08] bg-gradient-to-br from-surface-1/[0.84] via-surface-1/[0.58] to-surface-2/[0.7] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-[420px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl"
      />
      <div className="relative grid grid-cols-3 items-end gap-3 sm:gap-6">
        <Step entry={second} rank={2} payout={payouts?.payouts[1]} payoutMeta={payouts} />
        <Step entry={first} rank={1} payout={payouts?.payouts[0]} payoutMeta={payouts} />
        <Step entry={third} rank={3} payout={payouts?.payouts[2]} payoutMeta={payouts} />
      </div>
    </div>
  );
}

const RANK_LABEL = { 1: "1ᵉʳ", 2: "2ᵉ", 3: "3ᵉ" } as const;

function Step({
  entry,
  rank,
  payout,
  payoutMeta,
}: {
  entry: StandingEntry | undefined;
  rank: 1 | 2 | 3;
  payout?: number;
  payoutMeta?: PayoutInfo;
}) {
  const podiumH =
    rank === 1 ? "h-32 sm:h-36" : rank === 2 ? "h-24 sm:h-28" : "h-20 sm:h-24";

  if (!entry) {
    // Keep the podium silhouette intact: a muted plinth instead of a lone dot.
    return (
      <div className="flex flex-col items-center">
        <div className="mb-3 size-14 rounded-full border border-dashed border-white/15 bg-white/[0.02] sm:size-16" />
        <div className="mb-3 text-sm font-medium text-text-tertiary">—</div>
        <div
          className={cn(
            "w-full rounded-t-[8px] border border-white/[0.06] bg-gradient-to-t from-white/[0.035] to-transparent",
            podiumH,
          )}
        >
          <div className="flex h-full items-center justify-center">
            <span className="font-display text-3xl font-extrabold text-text-tertiary/40 sm:text-4xl">
              {RANK_LABEL[rank]}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const config = {
    1: {
      avatarSize: "size-20 sm:size-24",
      avatarRing: "ring-4 ring-gold-500/50 shadow-glow-gold",
      avatarBg: "from-gold-500/40 to-gold-500/10",
      icon: (
        <Crown className="absolute -top-3 left-1/2 size-7 -translate-x-1/2 fill-gold-400 text-gold-400 drop-shadow-[0_0_8px_rgba(245,196,71,0.8)]" />
      ),
      podiumGrad:
        "from-gold-500/30 via-gold-500/15 to-transparent border-gold-500/40",
      podiumText: "text-gold-300",
      nameColor: "text-gold-200",
      nameWeight: "font-bold",
      payoutChip: "bg-gold-500/15 text-gold-200 ring-gold-500/35",
    },
    2: {
      avatarSize: "size-16 sm:size-20",
      avatarRing: "ring-2 ring-white/35",
      avatarBg: "from-white/20 to-white/5",
      icon: (
        <Trophy
          className="absolute -top-2 left-1/2 size-5 -translate-x-1/2 text-text-primary/85"
          strokeWidth={1.5}
        />
      ),
      podiumGrad: "from-white/15 via-white/[0.06] to-transparent border-white/20",
      podiumText: "text-text-primary",
      nameColor: "text-text-primary",
      nameWeight: "font-semibold",
      payoutChip: "bg-white/10 text-text-primary ring-white/25",
    },
    3: {
      avatarSize: "size-14 sm:size-16",
      avatarRing: "ring-2 ring-amber-600/50",
      avatarBg: "from-amber-700/35 to-amber-700/5",
      icon: (
        <Medal
          className="absolute -top-2 left-1/2 size-5 -translate-x-1/2 text-amber-500"
          strokeWidth={1.5}
        />
      ),
      podiumGrad:
        "from-amber-700/25 via-amber-700/10 to-transparent border-amber-700/30",
      podiumText: "text-amber-300",
      nameColor: "text-amber-300",
      nameWeight: "font-semibold",
      payoutChip: "bg-amber-700/15 text-amber-300 ring-amber-700/35",
    },
  }[rank];

  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-3">
        {config.icon}
        <UserAvatar
          src={entry.avatar_url}
          name={entry.display_name ?? entry.username}
          className={cn(config.avatarSize, config.avatarRing)}
          fallbackClassName={cn(
            "bg-gradient-to-br font-display font-bold text-text-primary",
            config.avatarBg,
            rank === 1 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
          )}
        />
      </div>

      <div className="mb-3 max-w-full px-1 text-center">
        <Link
          href={`/u/${entry.username}`}
          className={cn(
            "block truncate text-sm transition hover:text-primary-400 hover:underline sm:text-base",
            config.nameColor,
            config.nameWeight,
            NAME_SHADOW,
          )}
        >
          @{entry.username}
        </Link>
        <div
          className={cn(
            "mt-1 font-display tabular-nums",
            rank === 1 ? "text-2xl font-bold sm:text-3xl" : "text-lg font-semibold",
            config.podiumText,
          )}
        >
          {entry.total_points}
          <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            pts
          </span>
        </div>
        {payout !== undefined && payout > 0 && payoutMeta && (
          <div
            className={cn(
              "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums ring-1",
              config.payoutChip,
            )}
          >
            <span aria-hidden>≈</span>
            {formatMoney(payout, payoutMeta.currency, payoutMeta.locale)}
          </div>
        )}
      </div>

      <div
        className={cn(
          "relative w-full overflow-hidden rounded-t-[8px] border bg-gradient-to-t",
          podiumH,
          config.podiumGrad,
        )}
      >
        {/* top highlight line for a crisper plinth edge */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-white/15"
        />
        <div className="flex h-full items-center justify-center">
          <span
            className={cn(
              "font-display font-extrabold tabular-nums",
              rank === 1 ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
              config.podiumText,
            )}
          >
            {RANK_LABEL[rank]}
          </span>
        </div>
      </div>
    </div>
  );
}
