import { NextResponse } from "next/server";
import { getBookingByRef, checkAccessToken } from "@/lib/bookings";
import { grantGuestAccess, rateLimit } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";

/** Private link from the confirmation email: validates the token, then remembers access in a cookie. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") ?? "";
  const token = url.searchParams.get("token");
  const ip = await clientIp();
  const b = rateLimit(`access:${ip}`, 30) ? getBookingByRef(ref) : null;
  if (!b || !checkAccessToken(b, token)) {
    return NextResponse.redirect(new URL("/booking/manage?error=link", url));
  }
  await grantGuestAccess(b.reference);
  return NextResponse.redirect(new URL(`/booking/${b.reference}`, url));
}
