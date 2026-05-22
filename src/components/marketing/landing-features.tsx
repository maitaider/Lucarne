import { getTranslations } from "next-intl/server";
import Image from "next/image";
import {
  Banknote,
  ChevronRight,
  CircleDollarSign,
  LockKeyhole,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";

export async function LandingFeatures() {
  const t = await getTranslations("landing");

  const features = [
    {
      icon: CircleDollarSign,
      title: t("feature1Title"),
      body: t("feature1Body"),
      accent: "primary",
    },
    {
      icon: LockKeyhole,
      title: t("feature2Title"),
      body: t("feature2Body"),
      accent: "violet",
    },
    {
      icon: Trophy,
      title: t("feature3Title"),
      body: t("feature3Body"),
      accent: "gold",
    },
  ] as const;

  const steps = [
    {
      title: t("workflow1Title"),
      body: t("workflow1Body"),
    },
    {
      title: t("workflow2Title"),
      body: t("workflow2Body"),
    },
    {
      title: t("workflow3Title"),
      body: t("workflow3Body"),
    },
  ] as const;

  const trustItems = [
    {
      icon: ShieldCheck,
      title: t("trust1Title"),
      body: t("trust1Body"),
    },
    {
      icon: Banknote,
      title: t("trust2Title"),
      body: t("trust2Body"),
    },
    {
      icon: UsersRound,
      title: t("trust3Title"),
      body: t("trust3Body"),
    },
  ] as const;

  return (
    <>
      <section id="features" className="border-b border-border-subtle bg-base">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-24">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-400">
              {t("featuresEyebrow")}
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
              {t("featuresTitle")}
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-text-secondary">
              {t("featuresIntro")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:gap-5">
            {features.map(({ icon: Icon, title, body, accent }) => (
              <article
                key={title}
                className="group relative overflow-hidden rounded-[8px] border border-white/[0.08] bg-surface-1/[0.76] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-5 transition hover:border-primary-500/35 hover:bg-surface-2/70"
              >
                <div
                  aria-hidden
                  className={`mb-5 inline-flex size-11 items-center justify-center rounded-[8px] ${
                    accent === "primary"
                      ? "bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/20"
                      : accent === "violet"
                        ? "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20"
                        : "bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/20"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={1.6} />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-text-primary">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f3f7f2] text-[#11160f]">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#176943]">
                {t("workflowEyebrow")}
              </p>
              <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
                {t("workflowTitle")}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <article
                  key={step.title}
                  className="border-t border-[#c9d6c6] pt-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-[#176943]">
                      0{index + 1}
                    </span>
                    {index < steps.length - 1 && (
                      <ChevronRight
                        className="hidden size-4 text-[#789071] md:block"
                        strokeWidth={1.6}
                      />
                    )}
                  </div>
                  <h3 className="font-display text-xl font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#52604e]">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-y border-border-subtle bg-abyss">
        <Image
          src="/marketing/lucarne-hero-stadium.jpg"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-[72%_48%] opacity-30"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,6,5,0.98)_0%,rgba(5,6,5,0.9)_42%,rgba(5,6,5,0.55)_100%)]" />
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-24">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gold-400">
              {t("trustEyebrow")}
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
              {t("trustTitle")}
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-text-secondary">
              {t("trustIntro")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {trustItems.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-[8px] border border-white/[0.12] bg-white/[0.06] p-5 backdrop-blur"
              >
                <Icon className="mb-4 size-5 text-primary-400" strokeWidth={1.6} />
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
