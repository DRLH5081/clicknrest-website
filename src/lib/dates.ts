/**
 * Date helpers that work on plain "YYYY-MM-DD" strings in UTC so that a
 * night is always the same night regardless of server or browser timezone.
 */

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_DATE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseDate(s: string): Date {
  return new Date(s + "T00:00:00Z");
}

export function formatIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return formatIso(d);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);
}

/** Nights of a stay: check-in date up to (not including) check-out date. */
export function nightsBetween(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's date in the given IANA timezone, as YYYY-MM-DD. */
export function todayIn(timeZone = "Europe/London"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return parts;
  } catch {
    return formatIso(new Date());
  }
}

export function dayOfWeek(s: string): number {
  return parseDate(s).getUTCDay();
}

export function startOfMonth(s: string): string {
  return s.slice(0, 8) + "01";
}

export function addMonths(s: string, n: number): string {
  const d = parseDate(startOfMonth(s));
  d.setUTCMonth(d.getUTCMonth() + n);
  return formatIso(d);
}

export function daysInMonth(s: string): number {
  const d = parseDate(startOfMonth(s));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.getUTCDate();
}

export function formatDate(s: string, locale = "en-GB", opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!isIsoDate(s)) return s;
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(parseDate(s));
}

export function formatDateRange(a: string, b: string, locale = "en-GB"): string {
  return `${formatDate(a, locale, { weekday: "short", day: "numeric", month: "short" })} – ${formatDate(b, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;
}
