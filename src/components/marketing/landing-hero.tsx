import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LucarneMark } from "@/components/brand/lucarne-mark";
import { Countdown } from "./countdown";
import { FloatingFlags } from "./floating-flags";
import { ArrowRight, KeyRound, Trophy, Users, CalendarDays } from "lucide-react";

export async function LandingHero() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 80%)",
        }}
      />

      {/* Floating flags background */}
      <FloatingFlags />

      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:px-8">
        {/* Mark */}
        <div className="mb-10 flex items-center gap-3">
          <LucarneMark className="h-9 w-9 text-primary-500" />
          <span className="font-display text-xl font-semibold tracking-tight">
            {tCommon("appName")}
          </span>
        </div>

        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-400 backdrop-blur">
          <Trophy className="size-3.5" strokeWidth={2} />
          {t("heroEyebrow")}
        </div>

        {/* Title */}
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
          {t("heroTitle")}
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
          {t("heroSubtitle")}
        </p>

        {/* Countdown */}
        <div className="mt-10">
          <Countdown targetIso="2026-06-11T20:00:00Z" />
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/signup"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-semibold text-base shadow-glow-primary transition hover:bg-primary-400 hover:shadow-[0_0_32px_var(--color-primary-glow)]"
          >
            <KeyRound className="size-4" />
            {t("ctaHasCode")}
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-1/40 px-6 py-3.5 text-sm font-semibold text-text-primary backdrop-blur transition hover:border-primary-500/60 hover:bg-surface-2"
          >
            {t("ctaLearnMore")}
          </Link>
        </div>

        {/* Stat strip */}
        <div className="mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
          <StatStripItem
            icon={Users}
            value="48"
            label="équipes"
            color="text-primary-400"
          />
          <StatStripItem
            icon={Trophy}
            value="104"
            label="matchs"
            color="text-gold-400"
          />
          <StatStripItem
            icon={CalendarDays}
            value="40"
            label="jours"
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
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1/30 px-4 py-3 backdrop-blur">
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
