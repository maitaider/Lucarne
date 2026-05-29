import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getAppSettings,
  getOverviewStats,
  computePrizePool,
  formatMoney,
} from "@/lib/admin/economy";
import { listMyLeagues } from "@/lib/leagues/queries";
import { AdminInviteTool } from "@/components/admin/admin-invite-tool";
import { PageHero } from "@/components/layout/page-hero";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Coins,
  Crown,
  ShieldCheck,
  Ticket,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [stats, settings, leagues] = await Promise.all([
    getOverviewStats(),
    getAppSettings(),
    listMyLeagues(),
  ]);

  const seatsSold = stats.paying_users_count;
  const totalTokens = Math.floor(stats.net_cents / settings.token_price_cents);
  const prize = computePrizePool(stats.net_cents, settings);
  const deadline = settings.buy_in_deadline
    ? new Date(settings.buy_in_deadline)
    : null;
  const deadlinePassed = deadline ? deadline.getTime() < Date.now() : false;
  const daysToDeadline = deadline
    ? Math.max(
        Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        0,
      )
    : null;
  const fmt = (cents: number) => formatMoney(cents, settings.currency);

  return (
    <div className="space-y-6">
      <PageHero
        kicker={L === "fr" ? "Poste de contrôle" : "Ops console"}
        kickerIcon={ShieldCheck}
        accent="violet"
        title={
          L === "fr" ? "Vue d'ensemble admin" : "Admin overview"
        }
        description={
          L === "fr"
            ? "Paiements, joueurs payants, places vendues et cagnotte projetée — tout l'état du tournoi en un coup d'œil."
            : "Payments, paying players, seats sold, and projected prize pool — the tournament state at a glance."
        }
        visual={{
          src: "/assets/lucarne/claude-pack-20260525/svg/09-admin-ops-panel.svg",
          alt:
            L === "fr"
              ? "Console admin Lucarne"
              : "Lucarne admin ops panel",
        }}
        background="subtle"
      />

      {/* KPI grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label={L === "fr" ? "Argent collecté" : "Money collected"}
          value={fmt(stats.net_cents)}
          detail={
            stats.total_refunded_cents > 0
              ? `${fmt(stats.total_refunded_cents)} ${L === "fr" ? "remboursés" : "refunded"}`
              : `${stats.payment_count} ${L === "fr" ? "paiements" : "payments"}`
          }
          accent="primary"
        />
        <KpiCard
          icon={Users}
          label={L === "fr" ? "Joueurs payants" : "Paying players"}
          value={String(stats.paying_users_count)}
          detail={`${stats.payment_count} ${L === "fr" ? "transactions" : "transactions"}`}
          accent="violet"
        />
        <KpiCard
          icon={Coins}
          label={L === "fr" ? "Jetons en jeu" : "Tokens in play"}
          value={totalTokens.toLocaleString(L === "fr" ? "fr-FR" : "en-US")}
          detail={`${fmt(settings.token_price_cents)} ${L === "fr" ? "par jeton" : "per token"}`}
          accent="gold"
        />
        <KpiCard
          icon={Ticket}
          label={L === "fr" ? "Places vendues" : "Seats sold"}
          value={String(seatsSold)}
          detail={`${fmt(settings.buy_in_amount_cents)} ${L === "fr" ? "par place" : "per seat"}`}
          accent="gold"
          href="/admin/payments"
        />
      </section>

      {/* Invite players (create pool + generate code in one place) */}
      <AdminInviteTool
        leagues={leagues.map((l) => ({ id: l.id, name: l.name }))}
        locale={L}
      />

      {/* Deadline + prize pool */}
      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Deadline */}
        <div
          className={cn(
            "relative overflow-hidden rounded-[12px] border p-5 backdrop-blur-xl",
            deadlinePassed
              ? "border-error/40 bg-error/[0.08]"
              : deadline
                ? "border-gold-500/30 bg-gold-500/[0.06]"
                : "border-white/[0.08] bg-surface-1/[0.5]",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock
                className={cn(
                  "size-4",
                  deadlinePassed ? "text-error" : "text-gold-400",
                )}
                strokeWidth={1.7}
              />
              <h2 className="font-display text-base font-semibold text-text-primary">
                {L === "fr" ? "Date butoir d'achat" : "Buy-in deadline"}
              </h2>
            </div>
            <Link
              href="/admin/economy"
              className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary transition hover:text-text-primary"
            >
              {L === "fr" ? "Modifier" : "Edit"} →
            </Link>
          </div>
          {deadline ? (
            <>
              <p className="font-display text-2xl font-bold tabular-nums text-text-primary sm:text-3xl">
                {deadline.toLocaleString(L === "fr" ? "fr-FR" : "en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  deadlinePassed ? "text-error" : "text-text-secondary",
                )}
              >
                {deadlinePassed
                  ? L === "fr"
                    ? "La date est passée. Les nouveaux paiements sont bloqués."
                    : "Deadline has passed. New payments are blocked."
                  : L === "fr"
                    ? `Encore ${daysToDeadline} jour${daysToDeadline === 1 ? "" : "s"} pour acheter des jetons.`
                    : `${daysToDeadline} day${daysToDeadline === 1 ? "" : "s"} left to buy tokens.`}
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-semibold text-text-tertiary">
                {L === "fr" ? "Non définie" : "Not set"}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {L === "fr"
                  ? "Sans date butoir, les joueurs peuvent acheter à tout moment."
                  : "Without a deadline, players can buy in anytime."}
              </p>
            </>
          )}
        </div>

        {/* Prize pool projection */}
        <div className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.5] p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-gold-400" strokeWidth={1.7} />
              <h2 className="font-display text-base font-semibold text-text-primary">
                {L === "fr" ? "Cagnotte projetée" : "Projected prize pool"}
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {L === "fr" ? "Calcul live" : "Live estimate"}
            </span>
          </div>
          <p className="font-display text-3xl font-bold tabular-nums text-gold-300 sm:text-4xl">
            {fmt(prize.pool_cents)}
          </p>
          {prize.house_cents > 0 && (
            <p className="mt-1 text-xs text-text-tertiary">
              {L === "fr" ? "Commission maison" : "House rake"} :{" "}
              {fmt(prize.house_cents)} ·{" "}
              {settings.prize_distribution.house_rake_pct}%
            </p>
          )}
          {prize.payouts.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {prize.payouts.map((amount, idx) => {
                const tone =
                  idx === 0 ? "gold" : idx === 1 ? "silver" : "bronze";
                const labels = {
                  gold: { fr: "🥇 Champion", en: "🥇 Champion" },
                  silver: { fr: "🥈 Finaliste", en: "🥈 Runner-up" },
                  bronze: { fr: "🥉 3ᵉ place", en: "🥉 3rd place" },
                } as const;
                const label =
                  idx < 3
                    ? labels[tone][L]
                    : `${idx + 1}ᵉ · ${settings.prize_distribution.shares[idx]}%`;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md bg-white/[0.04] px-3 py-1.5 text-sm"
                  >
                    <span className="text-text-secondary">{label}</span>
                    <span className="font-display font-semibold tabular-nums text-text-primary">
                      {fmt(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] leading-5 text-text-tertiary">
            {settings.prize_distribution[
              L === "fr" ? "description_fr" : "description_en"
            ]}
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-text-primary">
          {L === "fr" ? "Actions rapides" : "Quick actions"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/admin/payments"
            icon={Wallet}
            title={L === "fr" ? "Enregistrer un paiement" : "Record a payment"}
            body={
              L === "fr"
                ? "Cash, virement, PayPal · crédite les jetons direct."
                : "Cash, transfer, PayPal · credits tokens instantly."
            }
            accent="primary"
          />
          <QuickAction
            href="/admin/economy"
            icon={Ticket}
            title={L === "fr" ? "Régler la place" : "Set seat price"}
            body={
              L === "fr"
                ? `Prix actuel ${fmt(settings.buy_in_amount_cents)}.`
                : `Current price ${fmt(settings.buy_in_amount_cents)}.`
            }
            accent="gold"
          />
          <QuickAction
            href="/admin/economy"
            icon={Coins}
            title={L === "fr" ? "Régler l'économie" : "Tune economy"}
            body={
              L === "fr"
                ? "Prix du jeton, deadline, partage cagnotte."
                : "Token price, deadline, prize split."
            }
            accent="gold"
          />
          <QuickAction
            href="/admin/users"
            icon={Users}
            title={L === "fr" ? "Gérer les joueurs" : "Manage players"}
            body={
              L === "fr"
                ? "Ajuster les soldes, promouvoir, voir les stats."
                : "Adjust balances, promote, view stats."
            }
            accent="violet"
          />
        </div>
      </section>

      {/* Alert if no payments yet */}
      {stats.payment_count === 0 && (
        <section className="rounded-[12px] border border-violet-500/30 bg-violet-500/[0.06] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 text-violet-300" strokeWidth={1.7} />
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold text-text-primary">
                {L === "fr"
                  ? "Aucun paiement enregistré pour le moment"
                  : "No payments recorded yet"}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {L === "fr"
                  ? "Quand un joueur te paie (cash, virement, PayPal…), enregistre-le dans Paiements. Les jetons seront crédités automatiquement à son solde."
                  : "When a player pays you (cash, transfer, PayPal…), record it in Payments. Tokens credit to their balance automatically."}
              </p>
              <Link
                href="/admin/payments"
                className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-violet-500 px-3 py-2 text-xs font-bold text-abyss shadow-glow-violet transition hover:bg-violet-400"
              >
                {L === "fr" ? "Ajouter un paiement" : "Add a payment"}
                <ArrowRight className="size-3" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  accent,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent: "primary" | "gold" | "violet" | "error";
  href?: string;
}) {
  const colors = {
    primary: "bg-primary-500/12 text-primary-300 ring-primary-500/30",
    gold: "bg-gold-500/12 text-gold-300 ring-gold-500/30",
    violet: "bg-violet-500/12 text-violet-300 ring-violet-500/30",
    error: "bg-error/12 text-error ring-error/30",
  }[accent];

  const card = (
    <div className="group rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] p-4 backdrop-blur-xl transition hover:border-white/[0.16] hover:bg-surface-1/[0.7]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={cn("rounded-md p-1.5 ring-1", colors)}>
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="font-display text-2xl font-bold tabular-nums text-text-primary sm:text-3xl">
        {value}
      </div>
      <p className="mt-1 text-xs text-text-tertiary">{detail}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function QuickAction({
  href,
  icon: Icon,
  title,
  body,
  accent,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  accent: "primary" | "gold" | "violet" | "error";
}) {
  const colors = {
    primary: "border-primary-500/30 hover:border-primary-500/50",
    gold: "border-gold-500/30 hover:border-gold-500/50",
    violet: "border-violet-500/30 hover:border-violet-500/50",
    error: "border-error/30 hover:border-error/50",
  }[accent];
  const iconColor = {
    primary: "text-primary-300",
    gold: "text-gold-300",
    violet: "text-violet-300",
    error: "text-error",
  }[accent];
  return (
    <Link
      href={href}
      className={cn(
        "group relative block rounded-[10px] border bg-surface-1/[0.5] p-4 backdrop-blur-xl transition hover:bg-surface-1/[0.7]",
        colors,
      )}
    >
      <Icon className={cn("size-5", iconColor)} strokeWidth={1.7} />
      <h3 className="mt-3 font-display text-sm font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-5 text-text-secondary">{body}</p>
      <ArrowRight
        className={cn(
          "absolute right-3 top-3 size-4 transition group-hover:translate-x-0.5",
          iconColor,
        )}
        strokeWidth={2}
      />
    </Link>
  );
}
