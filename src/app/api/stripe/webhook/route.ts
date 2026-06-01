import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Stripe webhook handler
 * ----------------------
 * Listens for checkout.session.completed → calls
 * public.fulfill_stripe_checkout() with the session id, which:
 *   - Inserts a real_payments row
 *   - Credits tokens to balance
 *   - Updates stripe_checkouts.status = 'paid'
 *
 * Setup:
 *   1. Stripe Dashboard → Developers → Webhooks → Add endpoint
 *      URL: https://<yourdomain>/api/stripe/webhook
 *      Events: checkout.session.completed
 *   2. Copy "Signing secret" → set STRIPE_WEBHOOK_SECRET env var
 *   3. For local dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
 */

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "webhook_secret_missing" },
      { status: 500 },
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "no_signature" }, { status: 400 });
  }

  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    const err = e as Error;
    return NextResponse.json(
      { error: "bad_signature", message: err.message },
      { status: 400 },
    );
  }

  if (event.type !== "checkout.session.completed") {
    // Not our concern
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as {
    id: string;
    payment_status?: string;
    metadata?: { kind?: string } | null;
  };

  // Shared Stripe account (also serves Yieldcove): Stripe fans this event out to
  // EVERY endpoint on the account, so we receive Yieldcove's checkouts too. Only
  // Lucarne buy-ins carry metadata.kind === "buy_in" (set in createCheckoutSession).
  // Ignore the rest with a 200 so Stripe doesn't retry on `checkout_not_found`.
  if (session.metadata?.kind !== "buy_in") {
    return NextResponse.json({ received: true, ignored: "not_lucarne" });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, status: session.payment_status });
  }

  // Fulfill via Supabase RPC (service role)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "supabase_not_configured" },
      { status: 500 },
    );
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("fulfill_stripe_checkout", {
    p_session_id: session.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "fulfill_error", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, real_payment_id: data });
}
