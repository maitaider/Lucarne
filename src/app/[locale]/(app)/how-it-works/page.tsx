import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { WorldTrophyMark } from "@/components/brand/sport-icons";
import {
  getAppSettings,
  getOverviewStats,
  computePrizePool,
  formatMoney,
} from "@/lib/admin/economy";
import {
  ArrowRight,
  CalendarDays,
  Coins,
  Eye,
  HelpCircle,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [settings, stats] = await Promise.all([
    getAppSettings(),
    getOverviewStats(),
  ]);
  const prize = computePrizePool(stats.net_cents, settings);
  const tokenPriceFmt = formatMoney(
    settings.token_price_cents,
    settings.currency,
  );
  const deadline = settings.buy_in_deadline
    ? new Date(settings.buy_in_deadline)
    : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Hero locale={L} />

      {/* Live economy snapshot */}
      <section className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LiveStat
          label={L === "fr" ? "Prix du jeton" : "Token price"}
          value={tokenPriceFmt}
          detail={L === "fr" ? "tarif officiel" : "official rate"}
        />
        <LiveStat
          label={L === "fr" ? "Date butoir" : "Deadline"}
          value={
            deadline
              ? deadline.toLocaleDateString(
                  L === "fr" ? "fr-FR" : "en-US",
                  { day: "2-digit", month: "short", year: "2-digit" },
                )
              : "—"
          }
          detail={
            deadline
              ? L === "fr"
                ? "fin des achats"
                : "buy-in ends"
              : L === "fr"
                ? "non fixée"
                : "not set"
          }
        />
        <LiveStat
          label={L === "fr" ? "Cagnotte projetée" : "Projected pool"}
          value={formatMoney(prize.pool_cents, settings.currency)}
          detail={
            stats.payment_count > 0
              ? `${stats.payment_count} ${L === "fr" ? "paiements" : "payments"}`
              : L === "fr"
                ? "à remplir"
                : "to grow"
          }
        />
        <LiveStat
          label={L === "fr" ? "Joueurs payants" : "Paying players"}
          value={String(stats.paying_users_count)}
          detail={
            L === "fr"
              ? "ont contribué"
              : "have contributed"
          }
        />
      </section>

      <PrizeBreakdown prize={prize} settings={settings} locale={L} />


      <Section
        title={L === "fr" ? "Comment ça marche" : "How it works"}
        subtitle={
          L === "fr"
            ? "Tu payes ton buy-in (Stripe ou admin). Les paris sont gratuits — ils rapportent des points. À la fin du tournoi, top 3 du classement partage la cagnotte."
            : "Pay your buy-in (Stripe or admin). Bets are free — they reward points. End of tournament: top 3 split the pot."
        }
      >
        <ol className="grid gap-4 md:grid-cols-2">
          <StepCard
            step={1}
            icon={CalendarDays}
            tone="primary"
            title={
              L === "fr"
                ? "Choisis un match à venir"
                : "Pick an upcoming match"
            }
            description={
              L === "fr"
                ? "Ouvre l'onglet Matchs → vue Calendrier ou Groupes. Repère une affiche qui te plaît, à plus de 60 secondes du coup d'envoi."
                : "Open Matches → Calendar or Groups view. Spot a fixture you like, more than 60s before kickoff."
            }
            tipLabel={L === "fr" ? "Astuce" : "Tip"}
            tip={
              L === "fr"
                ? "Les onglets Groupes te donnent les tableaux W/D/L avant chaque journée."
                : "Group tabs give you W/D/L tables before every matchday."
            }
            link={{ href: "/matches", label: L === "fr" ? "Voir les matchs" : "Browse matches" }}
          />

          <StepCard
            step={2}
            icon={Zap}
            tone="violet"
            title={
              L === "fr" ? "Pronostique en 3 onglets" : "3-tab quick bet"
            }
            description={
              L === "fr"
                ? "Sur n'importe quelle fiche match, 3 onglets : Vainqueur (1N2, +3 pts) · Total de buts (+5 pts si exact, +2 si à ±1) · Buteurs (+4 pts par joueur correct, jusqu'à 4). Aucune mise."
                : "On any match card, 3 tabs: Winner (1X2, +3 pts) · Total goals (+5 exact, +2 if within 1) · Scorers (+4 pts per correct player, up to 4). No stake."
            }
            tipLabel={L === "fr" ? "Détail" : "Detail"}
            tip={
              L === "fr"
                ? "Tu peux changer ton pronostic jusqu'à 1 heure avant le coup d'envoi."
                : "You can change your prediction up to 1 hour before kickoff."
            }
            badge={L === "fr" ? "Gratuit" : "Free"}
          />

          <StepCard
            step={3}
            icon={ShieldCheck}
            tone="gold"
            title={L === "fr" ? "Paie ton buy-in" : "Pay your buy-in"}
            description={
              L === "fr"
                ? "Stripe sur ton wallet (carte) ou l'admin enregistre ton paiement (cash, virement). Tout l'argent collecté forme la cagnotte finale."
                : "Stripe in your wallet (card) or admin records your payment (cash, transfer). All collected money becomes the final pot."
            }
            tipLabel={L === "fr" ? "Important" : "Important"}
            tip={
              L === "fr"
                ? "Tu peux parier sans buy-in pour t'amuser, mais seuls les contributeurs touchent la cagnotte."
                : "You can bet without buy-in for fun, but only contributors share the pot."
            }
          />

          <StepCard
            step={4}
            icon={Trophy}
            tone="primary"
            title={
              L === "fr"
                ? "Top 3 partage la cagnotte"
                : "Top 3 share the pot"
            }
            description={
              L === "fr"
                ? "À la fin du Mondial, les points cumulés déterminent le classement. 1er, 2e, 3e se partagent l'intégralité de l'argent collecté selon la répartition admin (par défaut : 50% / 30% / 20%)."
                : "At the end of the Cup, accumulated points decide the ranking. 1st, 2nd, 3rd split the entire pot following the admin distribution (default: 50% / 30% / 20%)."
            }
            tipLabel={L === "fr" ? "Barème points" : "Points scale"}
            tip={
              L === "fr"
                ? "Vainqueur +3 · Total buts +5 (exact) / +2 (±1) · Buteur +4 par joueur trouvé"
                : "Winner +3 · Total goals +5 (exact) / +2 (±1) · Scorer +4 per correct player"
            }
          />
        </ol>
      </Section>

      <Section
        title={L === "fr" ? "Avec tes amis" : "With your crew"}
        subtitle={
          L === "fr"
            ? "Crée une ligue privée pour défier ton groupe. Personne ne voit tes paris avant le coup d'envoi."
            : "Create a private league to challenge your group. Nobody sees your picks before kickoff."
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Users}
            tone="primary"
            title={L === "fr" ? "Ligues privées" : "Private leagues"}
            body={
              L === "fr"
                ? "Invite-les avec un code généré, fixe une limite de membres, et garde le contrôle."
                : "Invite via generated codes, set a member cap, stay in control."
            }
          />
          <FeatureCard
            icon={Eye}
            tone="gold"
            title={L === "fr" ? "Anti-copie native" : "Anti-copy by design"}
            body={
              L === "fr"
                ? "Les paris des amis se révèlent UNIQUEMENT au coup d'envoi serveur. Pas avant, pas de triche."
                : "Friends' picks only reveal AT server kickoff. Not before, no cheating."
            }
          />
          <FeatureCard
            icon={Sparkles}
            tone="violet"
            title={L === "fr" ? "Réactions live" : "Live reactions"}
            body={
              L === "fr"
                ? "Tape un 🔥 ou un 💀 sur le pari d'un pote au coup d'envoi pour le chambrer."
                : "Drop a 🔥 or 💀 on a friend's pick at kickoff to roast them."
            }
          />
        </div>
      </Section>

      <Section
        title={L === "fr" ? "Glossaire express" : "Quick glossary"}
        subtitle={
          L === "fr"
            ? "Les termes essentiels pour ne pas être perdu."
            : "The essential terms so you're never lost."
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Glossary term={L === "fr" ? "Jetons" : "Tokens"}>
            {L === "fr"
              ? "Monnaie virtuelle Lucarne. 1 jeton = 1 unité de mise. Tu commences avec 1 000."
              : "Lucarne's virtual currency. 1 token = 1 stake unit. You start with 1,000."}
          </Glossary>
          <Glossary term={L === "fr" ? "Mise" : "Stake"}>
            {L === "fr"
              ? "Le nombre de jetons que tu risques sur un pari. Plage : 10 à 1 000."
              : "How many tokens you risk on a bet. Range: 10 to 1,000."}
          </Glossary>
          <Glossary term={L === "fr" ? "Cote (×N)" : "Multiplier (×N)"}>
            {L === "fr"
              ? "Multiplicateur appliqué à ta mise si tu gagnes. ×2 pour un 1N2, ×8 pour un score exact."
              : "Multiplier applied to your stake on a win. ×2 for a winner pick, ×8 for an exact score."}
          </Glossary>
          <Glossary term={L === "fr" ? "Buffer 60s" : "60-second buffer"}>
            {L === "fr"
              ? "Tu ne peux plus parier sur un match moins de 60 secondes avant le coup d'envoi. Question de sécurité."
              : "You can't bet on a match within 60 seconds of kickoff. Safety guard."}
          </Glossary>
          <Glossary term={L === "fr" ? "Validation admin" : "Admin validation"}>
            {L === "fr"
              ? "Étape où l'admin confirme avoir reçu ton paiement IRL et passe ton ticket en 'Validé'."
              : "Step where the admin confirms your IRL payment and flips the ticket to 'Validated'."}
          </Glossary>
          <Glossary term={L === "fr" ? "Settlement" : "Settlement"}>
            {L === "fr"
              ? "Calcul automatique des gains à la fin d'un match. Le solde est mis à jour direct."
              : "Auto-calculation of winnings at the end of a match. Balance updates instantly."}
          </Glossary>
        </div>
      </Section>

      <CallToAction locale={L} />
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function LiveStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.5] p-4 backdrop-blur-xl">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-text-primary sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-[10px] text-text-tertiary">{detail}</p>
    </div>
  );
}

function PrizeBreakdown({
  prize,
  settings,
  locale,
}: {
  prize: { pool_cents: number; house_cents: number; payouts: number[] };
  settings: { currency: string; prize_distribution: { shares: number[]; house_rake_pct: number; description_fr: string; description_en: string } };
  locale: Locale;
}) {
  if (prize.pool_cents === 0) {
    return (
      <section className="mb-12 rounded-[14px] border border-gold-500/25 bg-gold-500/[0.06] p-6 backdrop-blur-xl">
        <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">
          {locale === "fr"
            ? "La cagnotte se construit avec vos contributions"
            : "The pool grows with your contributions"}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {locale === "fr"
            ? "Quand vous achetez des jetons via l'admin, la cagnotte se remplit. Voici comment elle sera partagée quand le tournoi se termine :"
            : "When you buy tokens via the admin, the pool fills. Here's how it gets split when the tournament ends:"}
        </p>
        <p className="mt-3 text-sm font-medium text-gold-300">
          {settings.prize_distribution[locale === "fr" ? "description_fr" : "description_en"]}
        </p>
      </section>
    );
  }
  return (
    <section className="mb-12 rounded-[14px] border border-gold-500/25 bg-gradient-to-br from-gold-500/[0.1] via-primary-500/[0.04] to-transparent p-6 backdrop-blur-xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">
            {locale === "fr" ? "Cagnotte actuelle" : "Current pool"}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {locale === "fr"
              ? "Mise à jour en temps réel selon les paiements admins."
              : "Updates live as admins record payments."}
          </p>
        </div>
        <p className="font-display text-3xl font-bold tabular-nums text-gold-300 sm:text-4xl">
          {formatMoney(prize.pool_cents, settings.currency)}
        </p>
      </div>
      <div className="mt-5 space-y-1.5">
        {prize.payouts.map((amount, idx) => {
          const labels = [
            { fr: "🥇 Champion", en: "🥇 Champion" },
            { fr: "🥈 Finaliste", en: "🥈 Runner-up" },
            { fr: "🥉 3ᵉ place", en: "🥉 3rd place" },
          ];
          const label = idx < 3
            ? labels[idx]?.[locale] ?? `${idx + 1}ᵉ`
            : `${idx + 1}ᵉ`;
          return (
            <div
              key={idx}
              className="flex items-center justify-between rounded-md bg-white/[0.04] px-3 py-2 text-sm"
            >
              <span className="text-text-secondary">
                {label} · {settings.prize_distribution.shares[idx]}%
              </span>
              <span className="font-display font-semibold tabular-nums text-text-primary">
                {formatMoney(amount, settings.currency)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Hero({ locale }: { locale: Locale }) {
  return (
    <section className="relative mb-12 overflow-hidden rounded-[14px] border border-white/[0.1] bg-gradient-to-br from-primary-500/[0.1] via-gold-500/[0.05] to-violet-500/[0.06] p-6 backdrop-blur-xl sm:p-10">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/[0.1] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400">
        <HelpCircle className="size-3.5" strokeWidth={2} />
        {locale === "fr" ? "Guide rapide" : "Quick guide"}
      </div>
      <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-5xl">
        {locale === "fr"
          ? "Comment ça marche ?"
          : "How it works"}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
        {locale === "fr"
          ? "Lucarne, c'est un terrain de pronostics privé pour la Coupe du Monde 2026. Voici tout ce qu'il faut savoir pour briller dès le premier match."
          : "Lucarne is a private prediction arena for the 2026 World Cup. Here's everything you need to know to shine from match one."}
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <Pill icon={Coins} label={locale === "fr" ? "1 000 jetons offerts" : "1,000 tokens free"} />
        <Pill icon={Target} label={locale === "fr" ? "8 types de pari" : "8 bet types"} />
        <Pill icon={Trophy} label="48 / 104" />
      </div>
    </section>
  );
}

function Pill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-text-secondary backdrop-blur-xl">
      <Icon className="size-3 text-primary-400" strokeWidth={2} />
      {label}
    </span>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <header className="mb-5">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
            {subtitle}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

function StepCard({
  step,
  icon: Icon,
  tone,
  title,
  description,
  tipLabel,
  tip,
  link,
  badge,
}: {
  step: number;
  icon: LucideIcon;
  tone: "primary" | "gold" | "violet";
  title: string;
  description: string;
  tipLabel: string;
  tip: string;
  link?: { href: string; label: string };
  badge?: string;
}) {
  const toneColors = {
    primary: {
      ring: "ring-primary-500/30",
      bg: "bg-primary-500/10 text-primary-300",
      glow: "shadow-glow-primary",
      stepBg: "bg-primary-500/20 text-primary-300 ring-primary-500/40",
    },
    gold: {
      ring: "ring-gold-500/30",
      bg: "bg-gold-500/10 text-gold-300",
      glow: "shadow-glow-gold",
      stepBg: "bg-gold-500/20 text-gold-300 ring-gold-500/40",
    },
    violet: {
      ring: "ring-violet-500/30",
      bg: "bg-violet-500/10 text-violet-300",
      glow: "shadow-glow-violet",
      stepBg: "bg-violet-500/20 text-violet-300 ring-violet-500/40",
    },
  }[tone];

  return (
    <li className={`relative overflow-hidden rounded-[14px] border border-white/[0.08] bg-surface-1/[0.5] p-5 backdrop-blur-xl transition hover:border-white/[0.18] hover:bg-surface-1/[0.7] ${toneColors.glow}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-10 items-center justify-center rounded-full font-display text-base font-bold tabular-nums ring-2 ${toneColors.stepBg}`}
          >
            {step}
          </span>
          <span className={`flex size-10 items-center justify-center rounded-full ring-1 ${toneColors.bg} ${toneColors.ring}`}>
            <Icon className="size-5" strokeWidth={1.8} />
          </span>
        </div>
        {badge && (
          <span className="rounded-full bg-primary-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300 ring-1 ring-primary-500/30">
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight text-text-primary">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
      <div className="mt-4 rounded-[8px] border border-white/[0.06] bg-white/[0.03] p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {tipLabel}
        </p>
        <p className="mt-1 text-xs text-text-secondary">{tip}</p>
      </div>
      {link && (
        <Link
          href={link.href}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-400 transition hover:text-primary-300"
        >
          {link.label}
          <ArrowRight className="size-3" strokeWidth={2.5} />
        </Link>
      )}
    </li>
  );
}

function FeatureCard({
  icon: Icon,
  tone,
  title,
  body,
}: {
  icon: LucideIcon;
  tone: "primary" | "gold" | "violet";
  title: string;
  body: string;
}) {
  const color = {
    primary: "text-primary-300 bg-primary-500/12 ring-primary-500/30",
    gold: "text-gold-300 bg-gold-500/12 ring-gold-500/30",
    violet: "text-violet-300 bg-violet-500/12 ring-violet-500/30",
  }[tone];
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.5] p-5 backdrop-blur-xl">
      <span className={`mb-3 inline-flex size-10 items-center justify-center rounded-full ring-1 ${color}`}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <h3 className="font-display text-base font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-1.5 text-xs leading-5 text-text-secondary">{body}</p>
    </div>
  );
}

function Glossary({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.07] bg-surface-1/[0.5] p-4 backdrop-blur-xl">
      <p className="text-xs font-bold uppercase tracking-wider text-primary-400">
        {term}
      </p>
      <p className="mt-1.5 text-sm leading-5 text-text-secondary">{children}</p>
    </div>
  );
}

function CallToAction({ locale }: { locale: Locale }) {
  return (
    <section className="relative overflow-hidden rounded-[14px] border border-gold-500/25 bg-gradient-to-br from-gold-500/[0.12] via-primary-500/[0.06] to-transparent p-6 backdrop-blur-xl sm:p-8">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-400 ring-1 ring-gold-500/30">
            <WorldTrophyMark className="size-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-text-primary sm:text-2xl">
              {locale === "fr"
                ? "Prêt à pronostiquer ?"
                : "Ready to predict?"}
            </h2>
            <p className="mt-1 max-w-md text-sm text-text-secondary">
              {locale === "fr"
                ? "Le coup d'envoi de la Coupe du Monde 2026 c'est dans pas longtemps. Place ton premier pari dès maintenant."
                : "World Cup 2026 kickoff is around the corner. Place your first bet now."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/matches"
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary-500 px-5 py-3 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400"
          >
            <Zap className="size-4" strokeWidth={2.5} />
            {locale === "fr" ? "Voir les matchs" : "Browse matches"}
          </Link>
          <Link
            href="/leagues/new"
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-white/[0.12] bg-white/[0.05] px-5 py-3 text-sm font-bold text-text-primary backdrop-blur transition hover:border-gold-500/35 hover:bg-white/[0.08]"
          >
            <KeyRound className="size-4" strokeWidth={2.5} />
            {locale === "fr" ? "Créer une ligue" : "Create a league"}
          </Link>
        </div>
      </div>
    </section>
  );
}
