import { getTranslations } from "next-intl/server";
import { Coins, Lock, Trophy } from "lucide-react";

export async function LandingFeatures() {
  const t = await getTranslations("landing");

  const features = [
    {
      icon: Coins,
      title: t("feature1Title"),
      body: t("feature1Body"),
      accent: "primary",
    },
    {
      icon: Lock,
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

  return (
    <section
      id="features"
      className="relative mx-auto max-w-6xl px-6 py-24 lg:px-8"
    >
      <h2 className="mb-12 font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
        {t("featuresTitle")}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, body, accent }) => (
          <article
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1/60 p-7 backdrop-blur transition hover:border-border-strong hover:bg-surface-2/60"
          >
            <div
              aria-hidden
              className={`mb-5 inline-flex size-12 items-center justify-center rounded-xl ${
                accent === "primary"
                  ? "bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/20"
                  : accent === "violet"
                    ? "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20"
                    : "bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/20"
              }`}
            >
              <Icon className="size-6" strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 font-display text-xl font-semibold tracking-tight text-text-primary">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              {body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
