import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Countdown } from "./countdown";
import { FloatingFlags } from "./floating-flags";
import { getPublicAccessPrice } from "@/lib/admin/economy";

/**
 * Closing conversion band. Full-bleed, with the floating-flags backdrop and a
 * live countdown — the page's final "claim your seat" push before the footer.
 * Copy lives in the `landing` namespace; the access price is interpolated at
 * runtime so it tracks the admin-editable economy settings.
 */
export async function LandingCta() {
  const t = await getTranslations("landing");
  const locale = await getLocale();
  const price = await getPublicAccessPrice();
  const priceLabel = (price.amount_cents / 100).toLocaleString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { style: "currency", currency: price.currency, maximumFractionDigits: 0 },
  );

  const stats = [
    { n: "48", l: t("ctaStatNations") },
    { n: "104", l: t("statMatches") },
    { n: "1", l: t("ctaStatStandings") },
  ];

  return (
    <section className="relative isolate overflow-hidden border-y border-gold-500/20 bg-abyss">
      {/* Closing nation visual — mirrors the Canada hero at the top */}
      <Image
        src="/assets/lucarne/world-cup-2026/11-algeria-2026-home-celebration.png"
        alt=""
        fill
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover object-[64%_28%] opacity-[0.45]"
      />
      <FloatingFlags />
      {/* Readability + brand wash over the photo and floating flags */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_42%,rgba(5,6,5,0.55),rgba(5,6,5,0.92))]" />

      <div className="mx-auto max-w-3xl px-6 py-24 text-center lg:px-8 lg:py-28">
        <Reveal>
          <div className="lk-stagger">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/35 bg-gold-500/[0.08] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-400 backdrop-blur">
              <Sparkles className="size-3.5" strokeWidth={2} />
              {t("ctaBandEyebrow")}
            </span>

            <h2 className="mt-6 text-balance font-display text-4xl font-semibold leading-[1.05] text-text-primary sm:text-5xl lg:text-6xl">
              {t("ctaBandTitle")}
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-text-secondary sm:text-lg">
              {t("ctaBandSubtitle", { price: priceLabel })}
            </p>

            <div className="mt-9 flex justify-center">
              <Countdown targetIso="2026-06-11T20:00:00Z" />
            </div>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary-500 px-7 py-3.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 hover:shadow-[0_0_34px_var(--color-primary-glow)] active:scale-[0.98] sm:w-auto"
              >
                <KeyRound className="size-4" strokeWidth={2} />
                {t("ctaBandHasCode")}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-white/[0.15] bg-white/[0.07] px-7 py-3.5 text-sm font-semibold text-text-primary backdrop-blur transition hover:border-primary-500/50 hover:bg-white/[0.12] active:scale-[0.98] sm:w-auto"
              >
                {t("ctaBandSignIn")}
              </Link>
            </div>

            <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-text-tertiary">
              <ShieldCheck className="size-3.5 text-primary-400" strokeWidth={1.8} />
              {t("ctaBandPaymentNote", { price: priceLabel })}
            </p>

            <div className="mx-auto mt-12 flex max-w-md items-stretch justify-center gap-3">
              {stats.map((s) => (
                <div
                  key={s.l}
                  className="flex-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-4 backdrop-blur"
                >
                  <div className="font-display text-3xl font-bold tabular-nums text-text-primary">
                    {s.n}
                  </div>
                  <div className="mt-0.5 text-xs uppercase tracking-wider text-text-tertiary">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
