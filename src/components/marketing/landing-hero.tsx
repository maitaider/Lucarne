import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { LucarneLogo } from "@/components/brand/lucarne-mark";
import { Countdown } from "./countdown";
import { CountUp } from "@/components/ui/count-up";
import { getPublicAccessPrice } from "@/lib/admin/economy";
import {
  ArrowRight,
  CalendarDays,
  KeyRound,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

export async function LandingHero() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const price = await getPublicAccessPrice();
  const priceLabel = (price.amount_cents / 100).toLocaleString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { style: "currency", currency: price.currency, maximumFractionDigits: 0 },
  );

  const proofItems = [
    { icon: Users, label: t("heroProofPrivate") },
    { icon: Zap, label: t("heroProofInstant") },
    { icon: Trophy, label: t("heroProofCup") },
  ] as const;

  return (
    <section className="relative isolate min-h-[86svh] overflow-hidden border-b border-white/10 bg-abyss">
      <Image
        src="/marketing/lucarne-hero-stadium.jpg"
        alt=""
        fill
        priority
        quality={86}
        sizes="100vw"
        className="absolute inset-0 -z-30 object-cover object-[62%_50%]"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(5,6,5,0.96)_0%,rgba(5,6,5,0.84)_34%,rgba(5,6,5,0.42)_67%,rgba(5,6,5,0.32)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_42%_at_22%_12%,rgba(34,217,130,0.2),transparent_62%),linear-gradient(180deg,rgba(5,6,5,0.1)_0%,rgba(5,6,5,0.94)_100%)]" />

      <div className="mx-auto flex min-h-[86svh] max-w-6xl flex-col px-6 py-5 lg:px-8">
        <nav className="flex min-w-0 items-center justify-between gap-3">
          <Link href="/" className="min-w-0 transition hover:opacity-85">
            <LucarneLogo
              label={tCommon("appName")}
              markClassName="size-9"
              textClassName="text-xl"
            />
          </Link>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center justify-center rounded-sm border border-white/[0.15] bg-white/[0.07] px-3 py-2 text-sm font-semibold text-text-primary backdrop-blur transition hover:border-primary-500/50 hover:bg-primary-500/[0.12] sm:px-4"
          >
            {t("ctaSignIn")}
          </Link>
        </nav>

        <div className="flex flex-1 flex-col justify-center py-16 sm:py-20 lg:py-24">
          <div className="lk-stagger max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-sm border border-gold-500/[0.35] bg-abyss/[0.45] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-400 backdrop-blur">
              <Trophy className="size-3.5" strokeWidth={2} />
              {t("heroEyebrow")}
            </div>

            <h1 className="font-display text-6xl font-semibold leading-none text-text-primary sm:text-7xl lg:text-8xl">
              {t("heroTitle")}
            </h1>

            <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-text-secondary sm:text-xl">
              {t("heroSubtitle")}
            </p>

            <div className="mt-7 grid max-w-xl gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
              {proofItems.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex max-w-full items-center gap-2 rounded-sm border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-text-secondary backdrop-blur"
                >
                  <Icon className="size-3.5 text-primary-400" strokeWidth={1.8} />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-9">
              <Countdown targetIso="2026-06-11T20:00:00Z" />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary-500 px-6 py-3.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 hover:shadow-[0_0_34px_var(--color-primary-glow)] sm:w-auto"
              >
                <KeyRound className="size-4" />
                {t("ctaHasCode")}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-white/[0.15] bg-white/[0.07] px-6 py-3.5 text-sm font-semibold text-text-primary backdrop-blur transition hover:border-primary-500/50 hover:bg-white/[0.11] sm:w-auto"
              >
                {t("ctaLearnMore")}
              </a>
            </div>

            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-text-tertiary">
              <ShieldCheck className="size-3.5 text-primary-400" strokeWidth={1.8} />
              {t("ctaPaymentNote", { price: priceLabel })}
            </p>
          </div>
        </div>

        <div className="grid gap-3 pb-8 sm:grid-cols-3">
          <StatStripItem
            icon={Users}
            value={<CountUp value={48} />}
            label={t("statTeams")}
            color="text-primary-400"
          />
          <StatStripItem
            icon={Trophy}
            value={<CountUp value={104} />}
            label={t("statMatches")}
            color="text-gold-400"
          />
          <StatStripItem
            icon={CalendarDays}
            value={<CountUp value={39} />}
            label={t("statDays")}
            color="text-violet-400"
          />
        </div>
      </div>
    </section>
  );
}

function StatStripItem({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof Users;
  value: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-white/[0.12] bg-abyss/[0.45] px-4 py-3 backdrop-blur">
      <Icon className={`size-5 ${color}`} strokeWidth={1.5} />
      <div>
        <div className="font-display text-2xl font-bold tabular-nums text-text-primary">
          {value}
        </div>
        <div className="text-xs uppercase tracking-wider text-text-tertiary">
          {label}
        </div>
      </div>
    </div>
  );
}
