"use server";

import { z } from "zod";
import { getStripe } from "./server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/admin/economy";
import { redirect } from "@/i18n/navigation";

const checkoutSchema = z.object({
  // Pack tier: pre-defined token bundles
  pack: z.enum(["small", "medium", "large", "custom"]).default("medium"),
  custom_tokens: z.number().int().min(10).max(10000).optional(),
  locale: z.enum(["fr", "en"]).default("fr"),
});

/** Predefined token packs (qty in tokens). Price computed from app_settings.token_price_cents. */
const PACKS = {
  small: 20,
  medium: 50,
  large: 200,
  custom: 0, // overridden by custom_tokens
} as const;

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; message: string; code?: string };

export async function createCheckoutSession(input: {
  pack?: "small" | "medium" | "large" | "custom";
  custom_tokens?: number;
  locale?: "fr" | "en";
}): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalide",
      code: "invalid_input",
    };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré", code: "no_supabase" };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      message:
        "Stripe n'est pas configuré (STRIPE_SECRET_KEY manquant). Contacte l'admin.",
      code: "no_stripe",
    };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Connexion requise", code: "unauthenticated" };
  }

  const settings = await getAppSettings();
  if (
    settings.buy_in_deadline &&
    new Date(settings.buy_in_deadline).getTime() < Date.now()
  ) {
    return {
      ok: false,
      message: "La date butoir d'achat est passée.",
      code: "deadline_passed",
    };
  }

  const tokens =
    parsed.data.pack === "custom"
      ? (parsed.data.custom_tokens ?? 0)
      : PACKS[parsed.data.pack];
  if (tokens <= 0) {
    return { ok: false, message: "Quantité invalide", code: "bad_qty" };
  }

  const amountCents = tokens * settings.token_price_cents;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const successUrl = `${appUrl}/${parsed.data.locale}/profile/wallet?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/${parsed.data.locale}/profile/wallet?stripe=cancelled`;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        tokens: String(tokens),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: settings.currency.toLowerCase(),
            unit_amount: amountCents,
            product_data: {
              name: `Lucarne · ${tokens} jetons`,
              description: `Achat de ${tokens} jetons (${settings.token_price_cents / 100} ${settings.currency} chacun)`,
            },
          },
        },
      ],
    });
  } catch (e) {
    const err = e as Error;
    return { ok: false, message: err.message, code: "stripe_error" };
  }

  // Pre-register checkout in DB (status pending) so webhook can fulfill it
  await supabase
    .from("stripe_checkouts")
    .insert({
      user_id: user.id,
      session_id: session.id,
      payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      amount_cents: amountCents,
      currency: settings.currency,
      tokens_to_credit: tokens,
      status: "pending",
    });

  if (!session.url) {
    return { ok: false, message: "Stripe session sans URL", code: "no_url" };
  }
  return { ok: true, url: session.url };
}

export async function redirectToCheckout(input: {
  pack?: "small" | "medium" | "large" | "custom";
  custom_tokens?: number;
  locale?: "fr" | "en";
}): Promise<void> {
  const res = await createCheckoutSession(input);
  if (res.ok) {
    redirect({ href: res.url, locale: input.locale ?? "fr" });
  }
}
