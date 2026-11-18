import { addMonths, dayOfWeek, diffDays, isIsoDate, nightsBetween, todayIn } from "./dates";
import type { Property, Season } from "./properties";
import { getSetting, type TaxSettings } from "./settings";
import { isRangeFree, releaseExpiredHolds } from "./availability";
import { smoobuNight } from "./smoobu";

export type NightPrice = { night: string; rate: number; label: string };

export type PriceBreakdown = {
  currency: string;
  nights: NightPrice[];
  nightCount: number;
  accommodation: number;
  averageNightly: number;
  cleaningFee: number;
  tax: { name: string; ratePercent: number; mode: TaxSettings["mode"]; amount: number };
  total: number;
  minNights: number;
};

export type QuoteError =
  | "invalid_dates"
  | "past_dates"
  | "too_far_ahead"
  | "min_stay"
  | "max_stay"
  | "too_many_guests"
  | "invalid_guests"
  | "unavailable";

export type QuoteResult = { ok: true; breakdown: PriceBreakdown } | { ok: false; error: QuoteError; message: string; minNights?: number };

export function seasonFor(seasons: Season[], night: string): Season | undefined {
  // Later-starting seasons win when ranges overlap, so a short "Christmas"
  // season can sit inside a longer "Winter" season.
  let match: Season | undefined;
  for (const s of seasons) {
    if (night >= s.start_date && night <= s.end_date) {
      if (!match || s.start_date >= match.start_date) match = s;
    }
  }
  return match;
}

export function nightlyRate(p: Pick<Property, "id" | "base_rate" | "weekend_rate" | "seasons">, night: string): NightPrice {
  // Linked to Smoobu: its price (from PriceLabs) wins over the dashboard rates.
  const sm = smoobuNight(p.id, night);
  if (sm?.price) return { night, rate: sm.price, label: "Nightly rate" };
  const season = seasonFor(p.seasons, night);
  if (season) return { night, rate: season.nightly_rate, label: season.name };
  const dow = dayOfWeek(night);
  if (p.weekend_rate && (dow === 5 || dow === 6)) return { night, rate: p.weekend_rate, label: "Weekend" };
  return { night, rate: p.base_rate, label: "Standard" };
}

export function minNightsFor(p: Pick<Property, "id" | "min_nights" | "seasons">, checkIn: string): number {
  const sm = smoobuNight(p.id, checkIn);
  if (sm?.min_stay) return Math.max(1, sm.min_stay);
  const season = seasonFor(p.seasons, checkIn);
  return Math.max(1, season?.min_nights ?? p.min_nights);
}

export function computeTax(subtotal: number, tax: TaxSettings): { amount: number; total: number } {
  if (tax.mode === "none" || !tax.ratePercent) return { amount: 0, total: subtotal };
  if (tax.mode === "included") {
    return { amount: Math.round((subtotal * tax.ratePercent) / (100 + tax.ratePercent)), total: subtotal };
  }
  const amount = Math.round((subtotal * tax.ratePercent) / 100);
  return { amount, total: subtotal + amount };
}

export function priceStay(p: Property, checkIn: string, checkOut: string): PriceBreakdown {
  const { currency } = getSetting("regional");
  const tax = getSetting("tax");
  const nights = nightsBetween(checkIn, checkOut).map((n) => nightlyRate(p, n));
  const accommodation = nights.reduce((s, n) => s + n.rate, 0);
  const subtotal = accommodation + p.cleaning_fee;
  const t = computeTax(subtotal, tax);
  return {
    currency,
    nights,
    nightCount: nights.length,
    accommodation,
    averageNightly: nights.length ? Math.round(accommodation / nights.length) : 0,
    cleaningFee: p.cleaning_fee,
    tax: { name: tax.name, ratePercent: tax.ratePercent, mode: tax.mode, amount: t.amount },
    total: t.total,
    minNights: minNightsFor(p, checkIn),
  };
}

/**
 * Validates a stay and prices it. This runs on the server for every quote
 * and again inside the booking transaction, so prices shown in the browser
 * are never trusted.
 */
export function quoteStay(
  p: Property,
  input: { checkIn: unknown; checkOut: unknown; guests: unknown },
  opts: { ignoreBookingId?: number; skipRules?: boolean; skipAvailability?: boolean } = {},
): QuoteResult {
  const { checkIn, checkOut } = input;
  const guests = Number(input.guests);
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) {
    return { ok: false, error: "invalid_dates", message: "Please choose a valid check-in and check-out date." };
  }
  if (!Number.isInteger(guests) || guests < 1) {
    return { ok: false, error: "invalid_guests", message: "Please choose the number of guests." };
  }
  const n = diffDays(checkIn, checkOut);
  if (!opts.skipRules) {
    const { timeZone } = getSetting("regional");
    const today = todayIn(timeZone);
    if (checkIn < today) return { ok: false, error: "past_dates", message: "Check-in can't be in the past." };
    const { maxAdvanceMonths } = getSetting("booking");
    if (checkIn > addMonths(today, maxAdvanceMonths)) {
      return { ok: false, error: "too_far_ahead", message: `Bookings open up to ${maxAdvanceMonths} months ahead.` };
    }
    if (guests > p.max_guests) {
      return { ok: false, error: "too_many_guests", message: `This home sleeps up to ${p.max_guests} guests.` };
    }
    const min = minNightsFor(p, checkIn);
    if (n < min) return { ok: false, error: "min_stay", message: `The minimum stay for these dates is ${min} nights.`, minNights: min };
    if (n > p.max_nights) return { ok: false, error: "max_stay", message: `The maximum stay is ${p.max_nights} nights. Contact us for longer stays.` };
  }
  if (!opts.skipAvailability) {
    releaseExpiredHolds();
    if (!isRangeFree(p.id, checkIn, checkOut, opts.ignoreBookingId)) {
      return { ok: false, error: "unavailable", message: "Sorry, some of those nights are no longer available. Please choose different dates." };
    }
  }
  return { ok: true, breakdown: priceStay(p, checkIn, checkOut) };
}
