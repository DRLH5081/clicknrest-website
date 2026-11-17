import { getDb } from "./db";
import { addDays, addMonths, diffDays, startOfMonth } from "./dates";

/** Net revenue (paid minus refunded), attributed to the month of check-in. */
export function revenueByMonth(fromMonth: string, months: number): { month: string; revenue: number; bookings: number }[] {
  const db = getDb();
  const out = [];
  for (let i = 0; i < months; i++) {
    const m = addMonths(fromMonth, i);
    const next = addMonths(m, 1);
    const r = db
      .prepare(
        `SELECT COALESCE(SUM(amount_paid - amount_refunded), 0) AS revenue, SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS bookings
           FROM bookings WHERE check_in >= ? AND check_in < ? AND status IN ('confirmed','cancelled')`,
      )
      .get(m, next) as { revenue: number; bookings: number | null };
    out.push({ month: m, revenue: r.revenue, bookings: r.bookings ?? 0 });
  }
  return out;
}

/** Share of available nights that are booked (blocked nights excluded from both sides). */
export function occupancy(from: string, to: string, propertyId?: number): number {
  const db = getDb();
  const days = diffDays(from, to);
  const props = propertyId
    ? 1
    : (db.prepare("SELECT COUNT(*) c FROM properties WHERE status = 'published'").get() as { c: number }).c;
  if (!props || days <= 0) return 0;
  const where = propertyId ? "AND property_id = ?" : "AND property_id IN (SELECT id FROM properties WHERE status = 'published')";
  const args: (string | number)[] = [from, to];
  if (propertyId) args.push(propertyId);
  const booked = (db.prepare(`SELECT COUNT(*) c FROM booking_nights WHERE night >= ? AND night < ? AND booking_id IS NOT NULL ${where}`).get(...args) as { c: number }).c;
  const blocked = (db.prepare(`SELECT COUNT(*) c FROM booking_nights WHERE night >= ? AND night < ? AND block_id IS NOT NULL ${where}`).get(...args) as { c: number }).c;
  const available = props * days - blocked;
  return available > 0 ? booked / available : 0;
}

export function propertyRevenue(propertyId: number, from: string, to: string): number {
  return (
    getDb()
      .prepare("SELECT COALESCE(SUM(amount_paid - amount_refunded),0) r FROM bookings WHERE property_id = ? AND check_in >= ? AND check_in < ? AND status IN ('confirmed','cancelled')")
      .get(propertyId, from, to) as { r: number }
  ).r;
}

export { addDays, startOfMonth };
