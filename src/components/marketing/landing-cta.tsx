import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Countdown } from "./countdown";
import { FloatingFlags } from "./floating-flags";
import { getPublicAccessPrice } from "@/lib/admin/economy";

/**
 * Closing conversion band. Full-bleed, with the floating-flags backdrop and a
 * live countdown — the page's final "claim your seat" push before the footer.
 * Bilingual inline (matches the footer pattern) to avoid touching message
 * catalogs.
 */
export async function LandingCta() {
  const locale = await getLocale();
  const fr = locale === "fr";
  const price = await getPublicAccessPrice();
  const priceLabel = (price.amount_cents / 100).toLocaleString(
    fr ? "fr-FR" : "en-US",
    { style: "currency", currency: price.currency, maximumFractionDigits: 0 },
  );

  const stats = fr
    ? [
        { n: "48", l: "nations" },
        { n: "104", l: "matchs" },
        { n: "1", l: "cagnotte" },
      ]
    : [
        { n: "48", l: "nations" },
        { n: "104", l: "matches" },
        { n: "1", l: "prize pot" },
      ];

  return (
    <section className="relative isolate overflow-hidden border-y border-gold-500/20 bg-abyss">
      <FloatingFlags />
      {/* Readability + brand wash over the floating flags */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_42%,rgba(5,6,5,0.55),rgba(5,6,5,0.92))]" />

      <div className="mx-auto max-w-3xl px-6 py-24 text-center lg:px-8 lg:py-28">
        <Reveal>
          <div className="lk-stagger">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/35 bg-gold-500/[0.08] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-300 backdrop-blur">
              <Sparkles className="size-3.5" strokeWidth={2} />
              {fr ? "Coup d'envoi · 11 juin 2026" : "Kickoff · June 11, 2026"}
            </span>

            <h2 className="mt-6 text-balance font-display text-4xl font-semibold leading-[1.05] text-text-primary sm:text-5xl lg:text-6xl">
              {fr
                ? "Prends ta place avant le premier coup d'envoi"
                : "Claim your seat before the first whistle"}
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-text-secondary sm:text-lg">
              {fr
                ? `Un salon privé entre amis, un accès unique à ${priceLabel}, toute la Coupe du Monde à suivre et à pronostiquer. Le classement se met à jour tout seul, et le pot du groupe récompense les meilleurs.`
                : `A private room with friends, a single ${priceLabel} access, the whole World Cup to follow and predict. The standings update on their own, and the group pot rewards the best.`}
            </p>

            <div className="mt-9 flex justify-center">
              <Countdown targetIso="2026-06-11T20:00:00Z" />
            </div>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary-500 px-7 py-3.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 hover:shadow-[0_0_34px_var(--color-primary-glow)] active:scale-[0.98] sm:w-auto"
              >
                <KeyRound className="size-4" strokeWidth={2} />
                {fr ? "J'ai un code d'invitation" : "I have an invite code"}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/[0.15] bg-white/[0.07] px-7 py-3.5 text-sm font-semibold text-text-primary backdrop-blur transition hover:border-primary-500/50 hover:bg-white/[0.12] active:scale-[0.98] sm:w-auto"
              >
                {fr ? "Se connecter" : "Sign in"}
              </Link>
            </div>

            <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-text-tertiary">
              <ShieldCheck className="size-3.5 text-primary-400" strokeWidth={1.8} />
              {fr
                ? "Paiement unique de 20 $ via Stripe · accès immédiat"
                : "One-time $20 payment via Stripe · instant access"}
            </p>

            <div className="mx-auto mt-12 flex max-w-md items-stretch justify-center gap-3">
              {stats.map((s) => (
                <div
                  key={s.l}
                  className="flex-1 rounded-[12px] border border-white/[0.1] bg-white/[0.04] px-3 py-4 backdrop-blur"
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
