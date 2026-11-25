import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-url";
import { getStripe, paymentMode, stripeSessionMethod } from "@/lib/payments";
import { confirmPaidBooking, getBookingByRef, getBookingById, rotateAccessToken } from "@/lib/bookings";
import { sendBookingConfirmation } from "@/lib/email";

/**
 * Guests land here after paying on Stripe Checkout. We check the session
 * with Stripe directly (never trusting the URL), confirm if paid, and show
 * the confirmation. The webhook does the same thing as a backup.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (paymentMode() !== "stripe" || !sessionId) return NextResponse.redirect(new URL("/booking/manage", siteUrl()));
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const b = session.client_reference_id ? getBookingByRef(session.client_reference_id) : null;
    if (!b) return NextResponse.redirect(new URL("/booking/manage", siteUrl()));
    if (session.payment_status === "paid") {
      const { newlyConfirmed } = confirmPaidBooking(b.id, {
        provider: "stripe",
        providerRef: session.id,
        amount: session.amount_total ?? b.total,
        paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        method: await stripeSessionMethod(session.id),
      });
      if (newlyConfirmed) await sendBookingConfirmation(getBookingById(b.id)!, rotateAccessToken(b.id));
      return NextResponse.redirect(new URL(`/booking/${b.reference}?confirmed=1`, siteUrl()));
    }
    return NextResponse.redirect(new URL(`/booking/${b.reference}`, siteUrl()));
  } catch (e) {
    console.error("[stripe] return check failed", e);
    return NextResponse.redirect(new URL("/booking/manage", siteUrl()));
  }
}
