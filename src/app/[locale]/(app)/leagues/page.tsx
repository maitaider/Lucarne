import { setRequestLocale } from "next-intl/server";
import { listMyLeagues } from "@/lib/leagues/queries";
import { isAdmin } from "@/lib/admin/queries";
import { Link } from "@/i18n/navigation";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { EmptyStateVisual } from "@/components/layout/empty-state-visual";
import {
  ArrowRight,
  Crown,
  Globe,
  Lock,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function LeaguesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const [leagues, admin] = await Promise.all([listMyLeagues(), isAdmin()]);
  const privateCount = leagues.filter((league) => league.visibility === "private").length;
  const memberCount = leagues.reduce((sum, league) => sum + league.member_count, 0);
  const premiumCount = leagues.filter((league) => league.allows_real_money).length;

  return (
    <AppPageShell width="ultra">
      <PageHero
        kicker={
          L === "fr" ? "Ligues privées" : "Private leagues"
        }
        kickerIcon={Crown}
        accent="gold"
        title={
          L === "fr" ? "Salons de compétition" : "Competition rooms"
        }
        description={
          L === "fr"
            ? `${leagues.length} ligue${leagues.length > 1 ? "s" : ""} pour suivre tes classements privés, inviter ton cercle et jouer la Coupe du Monde avec un vrai board dédié.`
            : `${leagues.length} league${leagues.length > 1 ? "s" : ""} to follow private standings, invite your circle, and play the World Cup with a dedicated board.`
        }
        actions={
          admin && (
            <Link
              href="/leagues/new"
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
            >
              <Plus className="size-4" />
              {L === "fr" ? "Nouvelle ligue" : "New league"}
            </Link>
          )
        }
        visual={{
          src: "/assets/lucarne/claude-pack-20260525/svg/06-private-league-room.svg",
          alt:
            L === "fr"
              ? "Salon de ligue privée Lucarne"
              : "Lucarne private league room",
        }}
      />

      <LeagueConsole
        locale={L}
        total={leagues.length}
        privateCount={privateCount}
        memberCount={memberCount}
        premiumCount={premiumCount}
      />

      {leagues.length === 0 ? (
        <EmptyLeagues locale={L} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.slug}`}
              className="group rounded-[8px] border border-white/[0.08] bg-surface-1/[0.72] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary-500/35 hover:bg-surface-2/[0.78] hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-xs text-text-tertiary">
                    {league.visibility === "private" ? (
                      <>
                        <Lock className="size-3" />
                        {locale === "fr" ? "Privée" : "Private"}
                      </>
                    ) : (
                      <>
                        <Globe className="size-3" />
                        {locale === "fr" ? "Publique" : "Public"}
                      </>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-semibold text-text-primary group-hover:text-primary-400">
                    {league.name}
                  </h2>
                  {league.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">
                      {league.description}
                    </p>
                  )}
                </div>
                {league.allows_real_money && (
                  <span className="rounded-full border border-gold-500/25 bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-400">
                    €
                  </span>
                )}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <LeagueCardMetric
                  icon={Users}
                  label={locale === "fr" ? "Membres" : "Members"}
                  value={`${league.member_count}/${league.member_limit}`}
                />
                <LeagueCardMetric
                  icon={Trophy}
                  label={locale === "fr" ? "Board" : "Board"}
                  value={locale === "fr" ? "Actif" : "Active"}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppPageShell>
  );
}

function LeagueConsole({
  locale,
  total,
  privateCount,
  memberCount,
  premiumCount,
}: {
  locale: Locale;
  total: number;
  privateCount: number;
  memberCount: number;
  premiumCount: number;
}) {
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <LeagueMetric
        icon={Trophy}
        label={locale === "fr" ? "Ligues" : "Leagues"}
        value={total}
        detail={locale === "fr" ? "boards suivis" : "tracked boards"}
        accent="gold"
      />
      <LeagueMetric
        icon={Lock}
        label={locale === "fr" ? "Privées" : "Private"}
        value={privateCount}
        detail={locale === "fr" ? "sur invitation" : "invite only"}
        accent="primary"
      />
      <LeagueMetric
        icon={Users}
        label={locale === "fr" ? "Membres" : "Members"}
        value={memberCount}
        detail={locale === "fr" ? "au total" : "total"}
        accent="violet"
      />
      <LeagueMetric
        icon={Crown}
        label={locale === "fr" ? "Premium" : "Premium"}
        value={premiumCount}
        detail={locale === "fr" ? "avec enjeu réel" : "real stake enabled"}
        accent="gold"
      />
    </section>
  );
}

function LeagueMetric({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  accent: "primary" | "gold" | "violet";
}) {
  const color = {
    primary: "border-primary-500/25 bg-primary-500/[0.09] text-primary-400",
    gold: "border-gold-500/30 bg-gold-500/[0.09] text-gold-400",
    violet: "border-violet-500/25 bg-violet-500/[0.09] text-violet-400",
  }[accent];

  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-surface-1/[0.64] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={`rounded-[8px] border p-1.5 ${color}`}>
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
      <div className="mt-1 text-xs text-text-tertiary">{detail}</div>
    </div>
  );
}

function LeagueCardMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-white/[0.07] bg-white/[0.035] px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        <Icon className="size-3" strokeWidth={1.7} />
        {label}
      </div>
      <div className="text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function EmptyLeagues({ locale }: { locale: Locale }) {
  const features = [
    {
      icon: Users,
      title: locale === "fr" ? "Invitations maîtrisées" : "Controlled invites",
      text:
        locale === "fr"
          ? "Un lien d’entrée, un nombre limite de membres et un classement privé."
          : "One entry link, a member limit, and a private leaderboard.",
    },
    {
      icon: ShieldCheck,
      title: locale === "fr" ? "Validation claire" : "Clear validation",
      text:
        locale === "fr"
          ? "Les règles de mise et les statuts restent lisibles pour tout le groupe."
          : "Stake rules and ticket status stay readable for the whole group.",
    },
    {
      icon: Trophy,
      title: locale === "fr" ? "Touche trophée" : "Trophy mode",
      text:
        locale === "fr"
          ? "Le board suit les points, les victoires et la course au podium."
          : "The board follows points, wins, and the podium race.",
    },
  ];

  return (
    <div className="rounded-[8px] border border-dashed border-white/[0.14] bg-surface-1/[0.62] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {locale === "fr" ? "Crée ton premier salon" : "Create your first room"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            {locale === "fr"
              ? "Une ligue transforme le Mondial en compétition privée avec classement, invitations et ambiance trophée."
              : "A league turns the World Cup into a private competition with standings, invites, and trophy atmosphere."}
          </p>
        </div>
        <Link
          href="/leagues/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
        >
          {locale === "fr" ? "Nouvelle ligue" : "New league"}
          <ArrowRight className="size-4" strokeWidth={2} />
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="rounded-[8px] border border-white/[0.08] bg-white/[0.035] p-4">
              <Icon className="mb-3 size-5 text-gold-400" strokeWidth={1.6} />
              <h3 className="text-sm font-semibold text-text-primary">{feature.title}</h3>
              <p className="mt-1 text-xs leading-5 text-text-secondary">{feature.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
