"use server";

import { z } from "zod";
import { getStripe } from "./server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAppSettings, effectiveBuyInDeadline } from "@/lib/admin/economy";
import { redirect } from "@/i18n/navigation";
import { revalidatePath } from "next/cache";

const checkoutSchema = z.object({
  locale: z.enum(["fr", "en"]).default("fr"),
});

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; message: string; code?: string };

/**
 * Creates a Stripe Checkout Session for the fixed seat / buy-in.
 * The amount is `app_settings.buy_in_amount_cents` (default $20 CAD).
 * Successful payment is fulfilled by the webhook → real_payments row,
 * which unlocks betting via has_paid_buy_in().
 */
export async function createCheckoutSession(input: {
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
  const deadline = effectiveBuyInDeadline(settings);
  if (deadline.getTime() < Date.now()) {
    return {
      ok: false,
      message: "La date butoire d'achat de place est passée.",
      code: "deadline_passed",
    };
  }

  // Refuse double-payment: if the user already has a confirmed buy-in,
  // there's nothing to sell them.
  const { data: existing } = await supabase
    .from("real_payments")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .gte("amount_cents", settings.buy_in_amount_cents)
    .limit(1);
  if (existing && existing.length > 0) {
    return {
      ok: false,
      message: "Ta place est déjà payée.",
      code: "already_paid",
    };
  }

  const amountCents = settings.buy_in_amount_cents;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const successUrl = `${appUrl}/${parsed.data.locale}/buy-in?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/${parsed.data.locale}/buy-in?stripe=cancelled`;

  // Token credit kept symbolic — 1 token per buy-in for ledger continuity.
  // The real unlock is the real_payments row, not the token balance.
  const tokensToCredit = 1;

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
        kind: "buy_in",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: settings.currency.toLowerCase(),
            unit_amount: amountCents,
            product_data: {
              name:
                parsed.data.locale === "fr"
                  ? "Lucarne · place pour la Coupe du Monde 2026"
                  : "Lucarne · World Cup 2026 seat",
              description:
                parsed.data.locale === "fr"
                  ? "Accès complet pour parier sur tous les matchs."
                  : "Full access to bet on every fixture.",
            },
          },
        },
      ],
    });
  } catch (e) {
    const err = e as Error;
    return { ok: false, message: err.message, code: "stripe_error" };
  }

  // Pre-register the checkout so the webhook can complete it.
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
      tokens_to_credit: tokensToCredit,
      status: "pending",
    });

  if (!session.url) {
    return { ok: false, message: "Stripe session sans URL", code: "no_url" };
  }
  return { ok: true, url: session.url };
}

export async function redirectToCheckout(input: {
  locale?: "fr" | "en";
}): Promise<void> {
  const res = await createCheckoutSession(input);
  if (res.ok) {
    redirect({ href: res.url, locale: input.locale ?? "fr" });
  }
}

/**
 * Confirms a Stripe Checkout the moment the user returns from payment —
 * without waiting for the webhook. Verifies the session is PAID and belongs
 * to the signed-in user, then fulfills it (idempotent RPC, so the webhook
 * firing later is harmless). This is what gives a payer *instant* access.
 */
export async function confirmStripeCheckout(
  sessionId: string,
): Promise<{ ok: boolean; code?: string }> {
  if (!sessionId) return { ok: false, code: "no_session" };

  const stripe = getStripe();
  if (!stripe) return { ok: false, code: "no_stripe" };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthenticated" };

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { ok: false, code: "retrieve_failed" };
  }

  // Security: only fulfill a PAID session that belongs to THIS user.
  if (session.client_reference_id !== user.id) {
    return { ok: false, code: "not_owner" };
  }
  if (session.payment_status !== "paid") {
    return { ok: false, code: "not_paid" };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, code: "no_admin" };

  const { error } = await admin.rpc("fulfill_stripe_checkout", {
    p_session_id: sessionId,
  });
  if (error) return { ok: false, code: "fulfill_failed" };

  // Bust the cached buy-in status so the next render sees the unlocked user.
  revalidatePath("/", "layout");
  return { ok: true };
}
