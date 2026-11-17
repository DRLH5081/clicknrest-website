import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeSessionMethod } from "@/lib/payments";
import { confirmPaidBooking, expireBooking, getBookingByRef, getBookingById, markPaymentFailed, rotateAccessToken } from "@/lib/bookings";
import { sendBookingConfirmation } from "@/lib/email";

/**
 * Stripe webhook. Configure in the Stripe dashboard with these events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired
 * and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type.startsWith("checkout.session.")) {
    const session = event.data.object as Stripe.Checkout.Session;
    const b = session.client_reference_id ? getBookingByRef(session.client_reference_id) : null;
    if (b) {
      if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") && session.payment_status === "paid") {
        const { newlyConfirmed } = confirmPaidBooking(b.id, {
          provider: "stripe",
          providerRef: session.id,
          amount: session.amount_total ?? b.total,
          paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          method: await stripeSessionMethod(session.id),
        });
        if (newlyConfirmed) await sendBookingConfirmation(getBookingById(b.id)!, rotateAccessToken(b.id));
      } else if (event.type === "checkout.session.async_payment_failed") {
        markPaymentFailed(b.id, "Stripe reported the payment failed.");
      } else if (event.type === "checkout.session.expired" && b.stripe_session_id === session.id) {
        expireBooking(b.id, "Stripe checkout session expired without payment; dates released.");
      }
    }
  }
  return NextResponse.json({ received: true });
}
