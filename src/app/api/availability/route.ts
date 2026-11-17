import { NextResponse } from "next/server";
import { getPropertyBySlug } from "@/lib/properties";
import { releaseExpiredHolds, takenNights } from "@/lib/availability";
import { addDays, addMonths, isIsoDate, todayIn } from "@/lib/dates";
import { getSetting } from "@/lib/settings";
import { nightlyRate, minNightsFor } from "@/lib/pricing";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const p = getPropertyBySlug(slug, { publishedOnly: true });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { timeZone } = getSetting("regional");
  const { maxAdvanceMonths } = getSetting("booking");
  const today = todayIn(timeZone);
  const fromParam = url.searchParams.get("from");
  const from = isIsoDate(fromParam) && fromParam > today ? fromParam : today;
  const toParam = url.searchParams.get("to");
  const maxTo = addDays(from, 120);
  const to = isIsoDate(toParam) && toParam > from && toParam <= maxTo ? toParam : addDays(from, 90);
  releaseExpiredHolds();
  // Guests only need to know a night is unavailable, not why.
  const unavailable = takenNights(p.id, from, to).map((n) => n.night);
  const rates: Record<string, number> = {};
  const minStay: Record<string, number> = {};
  for (let d = from; d < to; d = addDays(d, 1)) {
    rates[d] = nightlyRate(p, d).rate;
    const m = minNightsFor(p, d);
    if (m !== p.min_nights) minStay[d] = m;
  }
  return NextResponse.json(
    { today, maxDate: addMonths(today, maxAdvanceMonths), from, to, unavailable, rates, minStay, defaultMinNights: p.min_nights, maxGuests: p.max_guests },
    { headers: { "Cache-Control": "no-store" } },
  );
}
