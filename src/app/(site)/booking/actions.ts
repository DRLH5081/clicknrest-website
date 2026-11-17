"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getBookingByRef, confirmPaidBooking, markPaymentFailed, requestCancellation, rotateAccessToken, getBookingById, chooseBankTransfer, BookingError } from "@/lib/bookings";
import { grantGuestAccess, hasGuestAccess, rateLimit } from "@/lib/auth";
import { sendBookingConfirmation, sendCancellationRequestNotice, sendBankTransferInstructions } from "@/lib/email";
import { getSetting, bankTransferAvailable } from "@/lib/settings";
import { createStripeCheckout, paymentMode } from "@/lib/payments";
import { getDb } from "@/lib/db";
import { clientIp } from "@/lib/client-ip";
import { releaseExpiredHolds } from "@/lib/availability";

async function guestBooking(ref: string) {
  const b = getBookingByRef(ref);
  if (!b || !(await hasGuestAccess(b.reference))) redirect("/booking/manage?error=access");
  return b;
}

/** DEMO ONLY: simulates the payment provider's response. Disabled when Stripe is configured. */
export async function simulatePayment(ref: string, outcome: "success" | "failure" | "pay_by_bank") {
  if (paymentMode() !== "demo") throw new Error("Demo payments are disabled when a payment provider is configured.");
  releaseExpiredHolds();
  const b = await guestBooking(ref);
  if (b.payment_mode !== "demo") redirect(`/pay/${b.reference}`);
  if (b.status !== "pending") redirect(`/booking/${b.reference}`);
  if (outcome === "failure") {
    markPaymentFailed(b.id, "Simulated payment declined (demo).");
    redirect(`/pay/${b.reference}?failed=1`);
  }
  const { booking, newlyConfirmed } = confirmPaidBooking(b.id, {
    provider: "demo",
    providerRef: `demo_pay_${Date.now().toString(36)}`,
    amount: b.total,
    method: outcome === "pay_by_bank" ? "pay_by_bank" : "card",
  });
  if (newlyConfirmed) {
    const token = rotateAccessToken(booking.id);
    await sendBookingConfirmation(getBookingById(booking.id)!, token);
  }
  redirect(`/booking/${b.reference}?confirmed=1`);
}

export async function resumeStripePayment(ref: string) {
  const b = await guestBooking(ref);
  if (b.status !== "pending" || b.payment_mode !== "stripe") redirect(`/booking/${b.reference}`);
  const { url, sessionId } = await createStripeCheckout(b);
  getDb().prepare("UPDATE bookings SET stripe_session_id = ? WHERE id = ?").run(sessionId, b.id);
  redirect(url);
}

export async function payByBankTransfer(ref: string) {
  releaseExpiredHolds();
  const b = await guestBooking(ref);
  if (b.status !== "pending") redirect(`/booking/${b.reference}`);
  const pay = getSetting("payments");
  if (!bankTransferAvailable(pay)) redirect(`/pay/${b.reference}`);
  if (b.payment_method !== "bank_transfer") {
    try {
      const updated = chooseBankTransfer(b.id, pay.transferHoldHours);
      // The email carries a fresh private link, so the guest can come back to these details later.
      await sendBankTransferInstructions(updated, rotateAccessToken(updated.id));
    } catch (e) {
      if (!(e instanceof BookingError)) throw e;
      redirect(`/booking/${b.reference}`);
    }
  }
  redirect(`/pay/${b.reference}?transfer=1`);
}

export type FormState = { ok: boolean; message: string; values?: Record<string, string> } | null;

export async function requestCancellationAction(ref: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const b = await guestBooking(ref);
  if (b.status !== "confirmed") return { ok: false, message: "Only confirmed bookings can be cancelled." };
  if (b.cancellation_requested_at) return { ok: true, message: "We've already received your cancellation request." };
  const reason = String(formData.get("reason") ?? "").slice(0, 1000);
  requestCancellation(b.id, reason);
  await sendCancellationRequestNotice(getBookingById(b.id)!);
  revalidatePath(`/booking/${b.reference}`);
  return { ok: true, message: "Thanks. Your cancellation request has been sent. We'll confirm by email, including any refund due." };
}

const Lookup = z.object({
  reference: z.string().trim().min(4).max(20),
  email: z.string().trim().email(),
});

export async function lookupBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!rateLimit(`lookup:${ip}`, 10, 15 * 60_000)) return { ok: false, message: "Too many attempts. Please wait 15 minutes and try again.", values: { reference: String(formData.get("reference") ?? ""), email: String(formData.get("email") ?? "") } };
  const values = { reference: String(formData.get("reference") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = Lookup.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Please enter your booking reference and the email address you booked with.", values };
  const b = getBookingByRef(parsed.data.reference);
  // Same message whether the reference or the email is wrong.
  if (!b || b.guest_email.toLowerCase() !== parsed.data.email.toLowerCase() || b.status === "expired") {
    return { ok: false, message: "We couldn't find a booking with those details. Check your confirmation email, or contact us.", values };
  }
  await grantGuestAccess(b.reference);
  redirect(`/booking/${b.reference}`);
}
