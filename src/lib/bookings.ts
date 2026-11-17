import { getDb, nowIso } from "./db";
import { diffDays, nightsBetween } from "./dates";
import type { Property } from "./properties";
import { getPropertyById } from "./properties";
import { quoteStay, priceStay, computeTax, type PriceBreakdown } from "./pricing";
import { releaseExpiredHolds } from "./availability";
import { getSetting } from "./settings";
import { bookingReference, randomToken, sha256, safeEqual } from "./tokens";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "expired";
export type PaymentStatus = "unpaid" | "paid" | "partially_refunded" | "refunded" | "failed" | "paid_offline";

export type Booking = {
  id: number;
  reference: string;
  access_token_hash: string;
  property_id: number;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_message: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_mode: "demo" | "stripe" | "manual";
  payment_method: "card" | "pay_by_bank" | "bank_transfer";
  source: string;
  currency: string;
  accommodation_total: number;
  cleaning_fee: number;
  tax_total: number;
  tax_mode: string;
  total: number;
  amount_paid: number;
  amount_refunded: number;
  price_breakdown: string;
  hold_expires_at: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  cancellation_requested_at: string | null;
  cancellation_reason: string;
  cancelled_at: string | null;
  admin_notes: string;
  needs_attention: string;
  is_demo: number;
  created_at: string;
  updated_at: string;
};

export type BookingWithProperty = Booking & { property_name: string; property_slug: string };

export class BookingError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Error && /UNIQUE constraint failed: booking_nights/.test(e.message);
}

export function logEvent(bookingId: number, message: string, actor = "system") {
  getDb().prepare("INSERT INTO booking_events (booking_id, message, actor) VALUES (?, ?, ?)").run(bookingId, message, actor);
}

function reserveNights(propertyId: number, bookingId: number, checkIn: string, checkOut: string) {
  const ins = getDb().prepare("INSERT INTO booking_nights (property_id, night, booking_id) VALUES (?, ?, ?)");
  for (const night of nightsBetween(checkIn, checkOut)) ins.run(propertyId, night, bookingId);
}

export type GuestDetails = {
  name: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  message: string;
};

/**
 * Creates a booking that holds the dates while the guest pays.
 * Runs in an IMMEDIATE transaction (one writer at a time) and relies on the
 * UNIQUE(property_id, night) constraint as the final guard against overlaps.
 */
export function createPendingBooking(input: {
  property: Property;
  checkIn: string;
  checkOut: string;
  guest: GuestDetails;
  paymentMode: "demo" | "stripe";
}): { booking: Booking; accessToken: string } {
  const db = getDb();
  const { property, checkIn, checkOut, guest } = input;
  const guests = guest.adults + guest.children;
  const holdMinutes = getSetting("booking").holdMinutes;
  const accessToken = randomToken();

  const run = db.transaction((): Booking => {
    releaseExpiredHolds();
    const q = quoteStay(property, { checkIn, checkOut, guests });
    if (!q.ok) throw new BookingError(q.error, q.message);
    const b = q.breakdown;
    const holdUntil = new Date(Date.now() + holdMinutes * 60_000).toISOString();
    let ref = bookingReference();
    while (db.prepare("SELECT 1 FROM bookings WHERE reference = ?").get(ref)) ref = bookingReference();
    const info = db
      .prepare(
        `INSERT INTO bookings (reference, access_token_hash, property_id, check_in, check_out, nights, adults, children,
           guest_name, guest_email, guest_phone, guest_message, status, payment_status, payment_mode, source, currency,
           accommodation_total, cleaning_fee, tax_total, tax_mode, total, price_breakdown, hold_expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, 'website', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        ref,
        sha256(accessToken),
        property.id,
        checkIn,
        checkOut,
        b.nightCount,
        guest.adults,
        guest.children,
        guest.name,
        guest.email.toLowerCase(),
        guest.phone,
        guest.message,
        input.paymentMode,
        b.currency,
        b.accommodation,
        b.cleaningFee,
        b.tax.amount,
        b.tax.mode,
        b.total,
        JSON.stringify(b),
        holdUntil,
      );
    const id = Number(info.lastInsertRowid);
    reserveNights(property.id, id, checkIn, checkOut);
    logEvent(id, `Booking started on website; dates held until ${holdUntil}.`, "guest");
    return getBookingById(id)!;
  });

  try {
    return { booking: run.immediate(), accessToken };
  } catch (e) {
    if (isUniqueViolation(e)) throw new BookingError("unavailable", "Sorry, those dates were just booked by someone else. Please choose different dates.");
    throw e;
  }
}

export function getBookingById(id: number): Booking | null {
  return (getDb().prepare("SELECT * FROM bookings WHERE id = ?").get(id) as Booking | undefined) ?? null;
}

export function getBookingByRef(ref: string): Booking | null {
  return (getDb().prepare("SELECT * FROM bookings WHERE reference = ?").get(ref.trim().toUpperCase()) as Booking | undefined) ?? null;
}

export function getBookingWithProperty(ref: string): BookingWithProperty | null {
  return (
    (getDb()
      .prepare(
        "SELECT b.*, p.name AS property_name, p.slug AS property_slug FROM bookings b JOIN properties p ON p.id = b.property_id WHERE b.reference = ?",
      )
      .get(ref.trim().toUpperCase()) as BookingWithProperty | undefined) ?? null
  );
}

export function checkAccessToken(b: Booking, token: string | undefined | null): boolean {
  if (!token) return false;
  return safeEqual(sha256(token), b.access_token_hash);
}

export function breakdownOf(b: Booking): PriceBreakdown | null {
  try {
    const parsed = JSON.parse(b.price_breakdown);
    return parsed && parsed.nights ? (parsed as PriceBreakdown) : null;
  } catch {
    return null;
  }
}

/**
 * Marks a booking as paid and confirmed. Safe to call more than once (for
 * example if the payment provider retries a webhook). If the hold expired
 * before payment arrived, it tries to re-reserve the nights; if they have
 * gone, the booking is flagged for the owner to refund.
 */
export function confirmPaidBooking(
  bookingId: number,
  payment: { provider: "demo" | "stripe" | "bank_transfer"; providerRef: string; amount: number; paymentIntent?: string | null; method?: "card" | "pay_by_bank" },
): { booking: Booking; newlyConfirmed: boolean } {
  const db = getDb();
  const run = db.transaction(() => {
    const b = getBookingById(bookingId);
    if (!b) throw new BookingError("not_found", "Booking not found");
    if (b.payment_status === "paid" || b.status === "confirmed") return { booking: b, newlyConfirmed: false };
    const now = nowIso();
    let attention = "";
    if (b.status === "expired" || b.status === "cancelled") {
      try {
        // nested transaction = savepoint, so a partial insert is rolled back
        db.transaction(() => reserveNights(b.property_id, b.id, b.check_in, b.check_out))();
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
        attention = "Payment received after the hold expired and the dates are no longer free. Refund the guest or offer alternative dates.";
      }
    }
    db.prepare(
      `UPDATE bookings SET status = ?, payment_status = 'paid', amount_paid = ?, hold_expires_at = NULL, payment_method = ?,
         stripe_payment_intent = COALESCE(?, stripe_payment_intent), needs_attention = ?, updated_at = ? WHERE id = ?`,
    ).run(attention ? "cancelled" : "confirmed", payment.amount, payment.provider === "bank_transfer" ? "bank_transfer" : (payment.method ?? "card"), payment.paymentIntent ?? null, attention, now, b.id);
    db.prepare("INSERT INTO payments (booking_id, kind, amount, provider, provider_ref, note) VALUES (?, 'charge', ?, ?, ?, ?)").run(
      b.id,
      payment.amount,
      payment.provider,
      payment.providerRef,
      payment.provider === "demo"
        ? `Simulated ${payment.method === "pay_by_bank" ? "Pay by Bank" : "card"} payment. No money was taken.`
        : payment.provider === "bank_transfer"
          ? b.payment_mode === "demo"
            ? "Demo: bank transfer marked as received. No money was moved."
            : "Bank transfer marked as received by the owner."
          : "",
    );
    logEvent(b.id, attention || `Payment of ${payment.amount / 100} ${b.currency} recorded (${payment.provider}${payment.method === "pay_by_bank" ? ", Pay by Bank" : ""}). Booking confirmed.`);
    return { booking: getBookingById(b.id)!, newlyConfirmed: !attention };
  });
  return run.immediate();
}

/** The guest chose to pay by bank transfer: hold their dates for longer while the money arrives. */
export function chooseBankTransfer(bookingId: number, holdHours: number): Booking {
  const db = getDb();
  return db
    .transaction(() => {
      const b = getBookingById(bookingId);
      if (!b || b.status !== "pending") throw new BookingError("not_pending", "This booking is no longer awaiting payment.");
      if (b.payment_method === "bank_transfer") return b;
      const holdUntil = new Date(Date.now() + holdHours * 3_600_000).toISOString();
      db.prepare("UPDATE bookings SET payment_method = 'bank_transfer', payment_status = 'unpaid', hold_expires_at = ?, updated_at = ? WHERE id = ?").run(holdUntil, nowIso(), b.id);
      logEvent(b.id, `Guest chose bank transfer. Dates held for ${holdHours} hours.`);
      return getBookingById(b.id)!;
    })
    .immediate();
}

/** Owner gives a guest more time to pay by bank transfer. */
export function extendHold(bookingId: number, hours: number, actor: string): Booking {
  const db = getDb();
  return db
    .transaction(() => {
      const b = getBookingById(bookingId);
      if (!b || b.status !== "pending") throw new BookingError("not_pending", "Only bookings awaiting payment can be extended.");
      const from = Math.max(Date.now(), b.hold_expires_at ? new Date(b.hold_expires_at).getTime() : 0);
      db.prepare("UPDATE bookings SET hold_expires_at = ?, updated_at = ? WHERE id = ?").run(new Date(from + hours * 3_600_000).toISOString(), nowIso(), b.id);
      logEvent(b.id, `Hold extended by ${hours} hours.`, actor);
      return getBookingById(b.id)!;
    })
    .immediate();
}

export function markPaymentFailed(bookingId: number, note: string) {
  const db = getDb();
  db.prepare("UPDATE bookings SET payment_status = 'failed', updated_at = ? WHERE id = ? AND status = 'pending'").run(nowIso(), bookingId);
  logEvent(bookingId, note);
}

export function expireBooking(bookingId: number, note: string) {
  const db = getDb();
  db.transaction(() => {
    const r = db.prepare("UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'pending'").run(nowIso(), bookingId);
    if (r.changes) {
      db.prepare("DELETE FROM booking_nights WHERE booking_id = ?").run(bookingId);
      logEvent(bookingId, note);
    }
  })();
}

export function cancelBooking(bookingId: number, actor: string, reason: string) {
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), bookingId);
    db.prepare("DELETE FROM booking_nights WHERE booking_id = ?").run(bookingId);
    logEvent(bookingId, `Booking cancelled${reason ? `: ${reason}` : "."}`, actor);
  })();
}

export function requestCancellation(bookingId: number, reason: string) {
  getDb()
    .prepare("UPDATE bookings SET cancellation_requested_at = ?, cancellation_reason = ?, updated_at = ? WHERE id = ?")
    .run(nowIso(), reason, nowIso(), bookingId);
  logEvent(bookingId, `Guest requested cancellation${reason ? `: “${reason}”` : "."}`, "guest");
}

export function recordRefund(bookingId: number, amount: number, provider: string, providerRef: string, note: string, actor: string) {
  const db = getDb();
  db.transaction(() => {
    const b = getBookingById(bookingId)!;
    const refunded = b.amount_refunded + amount;
    const status: PaymentStatus = refunded >= b.amount_paid ? "refunded" : "partially_refunded";
    db.prepare("UPDATE bookings SET amount_refunded = ?, payment_status = ?, updated_at = ? WHERE id = ?").run(refunded, status, nowIso(), bookingId);
    db.prepare("INSERT INTO payments (booking_id, kind, amount, provider, provider_ref, note) VALUES (?, 'refund', ?, ?, ?, ?)").run(
      bookingId,
      amount,
      provider,
      providerRef,
      note,
    );
    logEvent(bookingId, `Refund of ${(amount / 100).toFixed(2)} ${b.currency} issued (${provider}).${note ? " " + note : ""}`, actor);
  })();
}

/** Suggested refund under the site-wide cancellation policy. */
export function policyRefund(b: Booking, today: string): { percent: number; amount: number; explanation: string } {
  const pol = getSetting("booking");
  const days = diffDays(today, b.check_in);
  const refundable = Math.max(0, b.amount_paid - b.amount_refunded);
  if (days >= pol.fullRefundDays) return { percent: 100, amount: refundable, explanation: `${days} days before check-in: full refund under policy.` };
  if (days >= pol.partialRefundDays) {
    return {
      percent: pol.partialRefundPercent,
      amount: Math.min(refundable, Math.round((b.amount_paid * pol.partialRefundPercent) / 100)),
      explanation: `${days} days before check-in: ${pol.partialRefundPercent}% refund under policy.`,
    };
  }
  return { percent: 0, amount: 0, explanation: `${Math.max(days, 0)} days before check-in: no refund due under policy.` };
}

/** Bookings taken by phone, email or another platform, entered by the owner. */
export function createManualBooking(input: {
  propertyId: number;
  checkIn: string;
  checkOut: string;
  guest: GuestDetails;
  source: string;
  paymentStatus: "unpaid" | "paid_offline";
  totalOverride: number | null;
  notes: string;
}): Booking {
  const db = getDb();
  const property = getPropertyById(input.propertyId);
  if (!property) throw new BookingError("not_found", "Property not found");
  const accessToken = randomToken();
  const run = db.transaction((): Booking => {
    releaseExpiredHolds();
    const q = quoteStay(property, { checkIn: input.checkIn, checkOut: input.checkOut, guests: input.guest.adults + input.guest.children }, { skipRules: true });
    if (!q.ok) throw new BookingError(q.error, q.error === "unavailable" ? "Those dates overlap an existing booking or blocked dates. Check the calendar." : q.message);
    let b = q.breakdown;
    if (input.totalOverride != null) {
      const tax = getSetting("tax");
      const t = computeTax(input.totalOverride, tax.mode === "added" ? { ...tax, mode: "included" } : tax);
      b = { ...b, total: input.totalOverride, tax: { ...b.tax, amount: t.amount } };
    }
    let ref = bookingReference();
    while (db.prepare("SELECT 1 FROM bookings WHERE reference = ?").get(ref)) ref = bookingReference();
    const info = db
      .prepare(
        `INSERT INTO bookings (reference, access_token_hash, property_id, check_in, check_out, nights, adults, children,
           guest_name, guest_email, guest_phone, guest_message, status, payment_status, payment_mode, source, currency,
           accommodation_total, cleaning_fee, tax_total, tax_mode, total, amount_paid, price_breakdown, admin_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, 'manual', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        ref,
        sha256(accessToken),
        property.id,
        input.checkIn,
        input.checkOut,
        b.nightCount,
        input.guest.adults,
        input.guest.children,
        input.guest.name,
        input.guest.email.toLowerCase(),
        input.guest.phone,
        input.guest.message,
        input.paymentStatus,
        input.source || "phone",
        b.currency,
        b.accommodation,
        b.cleaningFee,
        b.tax.amount,
        b.tax.mode,
        b.total,
        input.paymentStatus === "paid_offline" ? b.total : 0,
        JSON.stringify(b),
        input.notes,
      );
    const id = Number(info.lastInsertRowid);
    reserveNights(property.id, id, input.checkIn, input.checkOut);
    logEvent(id, `Booking added manually by owner (source: ${input.source || "phone"}).`, "admin");
    return getBookingById(id)!;
  });
  try {
    return run.immediate();
  } catch (e) {
    if (isUniqueViolation(e)) throw new BookingError("unavailable", "Those dates overlap an existing booking or blocked dates.");
    throw e;
  }
}

export function createBlock(propertyId: number, start: string, endExclusive: string, reason: string): number {
  const db = getDb();
  const run = db.transaction(() => {
    const info = db.prepare("INSERT INTO blocks (property_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)").run(propertyId, start, endExclusive, reason);
    const id = Number(info.lastInsertRowid);
    const ins = db.prepare("INSERT INTO booking_nights (property_id, night, block_id) VALUES (?, ?, ?)");
    for (const night of nightsBetween(start, endExclusive)) ins.run(propertyId, night, id);
    return id;
  });
  try {
    return run.immediate();
  } catch (e) {
    if (isUniqueViolation(e)) throw new BookingError("unavailable", "Some of those nights are already booked or blocked.");
    throw e;
  }
}

export function deleteBlock(blockId: number) {
  getDb().prepare("DELETE FROM blocks WHERE id = ?").run(blockId);
}

export { priceStay };

/** Issues a fresh private link token (only its hash is stored). */
export function rotateAccessToken(bookingId: number): string {
  const token = randomToken();
  getDb().prepare("UPDATE bookings SET access_token_hash = ? WHERE id = ?").run(sha256(token), bookingId);
  return token;
}
