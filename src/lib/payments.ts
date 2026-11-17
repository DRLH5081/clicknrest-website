import "server-only";
import Stripe from "stripe";
import type { Booking } from "./bookings";
import { getPropertyById } from "./properties";
import { formatDate } from "./dates";
import { siteUrl } from "./site-url";

/**
 * Payments.
 * - With STRIPE_SECRET_KEY set, guests pay on Stripe's hosted Checkout page
 *   (card details never touch this server) and a webhook confirms bookings.
 * - Without it the site runs in DEMO mode: a clearly labelled simulated
 *   payment page confirms bookings without taking any money.
 */
export function paymentMode(): "stripe" | "demo" {
  return process.env.STRIPE_SECRET_KEY ? "stripe" : "demo";
}

let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export async function createStripeCheckout(b: Booking): Promise<{ url: string; sessionId: string }> {
  const p = getPropertyById(b.property_id);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: b.guest_email,
    client_reference_id: b.reference,
    metadata: { booking_reference: b.reference, booking_id: String(b.id) },
    payment_intent_data: { metadata: { booking_reference: b.reference } },
    // Stripe's minimum session lifetime is 30 minutes.
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: b.currency.toLowerCase(),
          unit_amount: b.total,
          product_data: {
            name: `${p?.name ?? "Stay"} · ${b.nights} night${b.nights === 1 ? "" : "s"}`,
            description: `${formatDate(b.check_in)} to ${formatDate(b.check_out)} · Ref ${b.reference}`,
          },
        },
      },
    ],
    success_url: `${siteUrl()}/booking/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/pay/${b.reference}?cancelled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id };
}

/** Which way the guest paid on Stripe Checkout: by card or straight from their bank (Pay by Bank). */
export async function stripeSessionMethod(sessionId: string): Promise<"card" | "pay_by_bank"> {
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.payment_method"] });
    const pi = session.payment_intent;
    const pm = pi && typeof pi !== "string" ? pi.payment_method : null;
    return pm && typeof pm !== "string" && pm.type === "pay_by_bank" ? "pay_by_bank" : "card";
  } catch {
    return "card";
  }
}

export async function refundPayment(b: Booking, amount: number): Promise<{ provider: string; ref: string; note: string }> {
  if (b.payment_method === "bank_transfer" && b.payment_mode !== "demo") {
    return { provider: "bank_transfer", ref: "", note: "Recorded only. Send the money back to the guest by bank transfer." };
  }
  if (b.payment_mode === "stripe") {
    if (!b.stripe_payment_intent) throw new Error("No Stripe payment found for this booking.");
    const r = await getStripe().refunds.create({ payment_intent: b.stripe_payment_intent, amount, metadata: { booking_reference: b.reference } });
    return { provider: "stripe", ref: r.id, note: `Stripe refund status: ${r.status}` };
  }
  if (b.payment_mode === "demo") {
    return { provider: "demo", ref: `demo_re_${Date.now().toString(36)}`, note: "Simulated refund. No money was moved." };
  }
  return { provider: "manual", ref: "", note: "Recorded only. Refund the guest by the method they paid with." };
}
