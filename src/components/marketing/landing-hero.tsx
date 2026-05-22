import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LucarneMark } from "@/components/brand/lucarne-mark";
import { ArrowRight, KeyRound } from "lucide-react";

export async function LandingHero() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 80%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pt-24 pb-32 sm:pt-32 sm:pb-40 lg:px-8">
        {/* Mark */}
        <div className="mb-12 flex items-center gap-3">
          <LucarneMark className="h-9 w-9 text-primary-500" />
          <span className="font-display text-xl font-semibold tracking-tight">
            {tCommon("appName")}
          </span>
        </div>

        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1/60 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-text-secondary backdrop-blur">
          <span className="size-1.5 animate-pulse rounded-full bg-primary-500" />
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

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/signup"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 hover:shadow-[0_0_32px_var(--color-primary-glow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          >
            <KeyRound className="size-4" />
            {t("ctaHasCode")}
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-1/40 px-6 py-3.5 text-sm font-semibold text-text-primary backdrop-blur transition hover:border-primary-500/60 hover:bg-surface-2"
          >
            {t("ctaLearnMore")}
          </Link>
        </div>
      </div>
    </section>
  );
}
