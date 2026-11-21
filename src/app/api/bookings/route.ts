import { blockedByPrivateMode } from "@/lib/private-mode";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPropertyBySlug } from "@/lib/properties";
import { BookingError, createPendingBooking, expireBooking, getBookingById } from "@/lib/bookings";
import { grantGuestAccess, rateLimit } from "@/lib/auth";
import { paymentMode, createStripeCheckout } from "@/lib/payments";
import { getDb } from "@/lib/db";
import { clientIp } from "@/lib/client-ip";
import { refreshForStay } from "@/lib/smoobu";

const Body = z.object({
  slug: z.string().min(1).max(120),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z.string().trim().email("Please enter a valid email address.").max(200),
  phone: z.string().trim().min(6, "Please enter a phone number we can reach you on.").max(40),
  adults: z.coerce.number().int().min(1, "At least one adult is required.").max(30),
  children: z.coerce.number().int().min(0).max(30),
  message: z.string().trim().max(2000).optional().default(""),
  acceptTerms: z.literal(true, { message: "Please accept the booking terms and cancellation policy." }),
});

export async function POST(req: Request) {
  if (await blockedByPrivateMode()) return Response.json({ error: "This website is not open yet." }, { status: 403 });
  const ip = await clientIp();
  if (!rateLimit(`book:${ip}`, 20, 10 * 60_000)) {
    return NextResponse.json({ ok: false, message: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return NextResponse.json({ ok: false, message: "Please check the highlighted details.", fieldErrors }, { status: 422 });
  }
  const d = parsed.data;
  const property = getPropertyBySlug(d.slug, { publishedOnly: true });
  if (!property) return NextResponse.json({ ok: false, message: "This home is no longer available to book." }, { status: 404 });

  // Re-check Smoobu for these exact nights, so a night sold on Airbnb moments ago can't be booked twice.
  await refreshForStay(property.id, d.checkIn, d.checkOut);

  const mode = paymentMode();
  let bookingId: number;
  let reference: string;
  try {
    const { booking } = createPendingBooking({
      property,
      checkIn: d.checkIn,
      checkOut: d.checkOut,
      guest: { name: d.name, email: d.email, phone: d.phone, adults: d.adults, children: d.children, message: d.message },
      paymentMode: mode,
    });
    bookingId = booking.id;
    reference = booking.reference;
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: 409 });
    console.error(e);
    return NextResponse.json({ ok: false, message: "Something went wrong creating your booking. Please try again." }, { status: 500 });
  }

  await grantGuestAccess(reference);

  if (mode === "stripe") {
    try {
      const { url, sessionId } = await createStripeCheckout(getBookingById(bookingId)!);
      getDb().prepare("UPDATE bookings SET stripe_session_id = ? WHERE id = ?").run(sessionId, bookingId);
      return NextResponse.json({ ok: true, reference, redirect: url });
    } catch (e) {
      console.error("[stripe] checkout failed", e);
      expireBooking(bookingId, "Could not start Stripe checkout; dates released.");
      return NextResponse.json({ ok: false, message: "We couldn't connect to our payment provider. Your card has not been charged. Please try again shortly." }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true, reference, redirect: `/pay/${reference}` });
}
