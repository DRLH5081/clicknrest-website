import { getDb, nowIso } from "./db";
import { addDays } from "./dates";

/**
 * Releases nights held by checkouts that were started but never paid.
 * Called before any availability check so stale holds never block guests.
 */
export function releaseExpiredHolds(): number {
  const db = getDb();
  const now = nowIso();
  const expired = db
    .prepare("SELECT id FROM bookings WHERE status = 'pending' AND hold_expires_at IS NOT NULL AND hold_expires_at < ?")
    .all(now) as { id: number }[];
  if (expired.length === 0) return 0;
  const tx = db.transaction(() => {
    for (const { id } of expired) {
      db.prepare("DELETE FROM booking_nights WHERE booking_id = ?").run(id);
      db.prepare("UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'pending'").run(now, id);
      db.prepare("INSERT INTO booking_events (booking_id, message) VALUES (?, ?)").run(id, "Checkout hold expired before payment; dates released.");
    }
  });
  tx();
  return expired.length;
}

export type NightState = { night: string; kind: "booked" | "blocked" | "held" };

/** All taken nights for a property between two dates (inclusive from, exclusive to). */
export function takenNights(propertyId: number, from: string, to: string): NightState[] {
  const rows = getDb()
    .prepare(
      `SELECT n.night, n.block_id, b.status
         FROM booking_nights n LEFT JOIN bookings b ON b.id = n.booking_id
        WHERE n.property_id = ? AND n.night >= ? AND n.night < ?
        ORDER BY n.night`,
    )
    .all(propertyId, from, to) as { night: string; block_id: number | null; status: string | null }[];
  return rows.map((r) => ({
    night: r.night,
    kind: r.block_id ? "blocked" : r.status === "pending" ? "held" : "booked",
  }));
}

export function isRangeFree(propertyId: number, checkIn: string, checkOut: string, ignoreBookingId?: number): boolean {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM booking_nights
        WHERE property_id = ? AND night >= ? AND night < ? AND (booking_id IS NULL OR booking_id != ?)`,
    )
    .get(propertyId, checkIn, checkOut, ignoreBookingId ?? -1) as { c: number };
  return row.c === 0;
}

/** First date on/after `from` that starts a run of at least `minNights` free nights. */
export function nextAvailableStart(propertyId: number, from: string, minNights: number, horizonDays = 365): string | null {
  const to = addDays(from, horizonDays);
  const taken = new Set(takenNights(propertyId, from, to).map((n) => n.night));
  let run = 0;
  let start = from;
  for (let d = from; d < to; d = addDays(d, 1)) {
    if (taken.has(d)) {
      run = 0;
      start = addDays(d, 1);
    } else {
      run++;
      if (run >= minNights) return start;
    }
  }
  return null;
}
