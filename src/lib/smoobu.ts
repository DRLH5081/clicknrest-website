import crypto from "node:crypto";
import { getDb, nowIso } from "./db";
import { addDays, addMonths, todayIn } from "./dates";
import { getSetting } from "./settings";

/**
 * Smoobu connection (https://docs.smoobu.com).
 *
 * - Reads nightly price, minimum stay and availability for every linked
 *   apartment into the `smoobu_nights` table (PriceLabs prices arrive in
 *   Smoobu, so they show up here too). Pricing and availability use that
 *   table first and fall back to the dashboard rates for unlinked homes.
 * - Sends paid website bookings to Smoobu, which blocks the dates on Airbnb
 *   and every other channel, and cancels them there when cancelled here.
 *
 * Auth is Smoobu's signed (HMAC-SHA256) API key: SMOOBU_API_KEY + SMOOBU_API_SECRET.
 * Without both, everything here is switched off and the site uses its own rates.
 */

const BASE = process.env.SMOOBU_BASE_URL || "https://login.smoobu.com";
/** Smoobu channel for bookings made on your own website ("Homepage"). */
const CHANNEL_ID = Number(process.env.SMOOBU_CHANNEL_ID || 70);
const SYNC_KEY = "smoobu_status";

export function smoobuEnabled(): boolean {
  return Boolean(process.env.SMOOBU_API_KEY && process.env.SMOOBU_API_SECRET);
}

/** RFC 3986 encoding, as Smoobu's canonical string requires (space = %20, [] = %5B%5D). */
function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Canonical query: every key/value RFC 3986-encoded, sorted alphabetically. */
export function canonicalQuery(params: [string, string][]): string {
  return params
    .map(([k, v]) => [rfc3986(k), rfc3986(v)] as const)
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

/** METHOD\nPATH\nQUERY\nTIMESTAMP\nNONCE\nsha256hex(body)\nAPI_KEY, signed with the secret, base64. */
export function signRequest(o: { method: string; path: string; query: string; timestamp: string; nonce: string; body: string; apiKey: string; secret: string }): string {
  const bodyHash = crypto.createHash("sha256").update(o.body, "utf8").digest("hex");
  const canonical = [o.method.toUpperCase(), o.path, o.query, o.timestamp, o.nonce, bodyHash, o.apiKey].join("\n");
  return crypto.createHmac("sha256", o.secret).update(canonical, "utf8").digest("base64");
}

export class SmoobuError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function call<T>(method: "GET" | "POST" | "DELETE", path: string, params: [string, string][] = [], body?: unknown): Promise<T> {
  const apiKey = process.env.SMOOBU_API_KEY ?? "";
  const secret = process.env.SMOOBU_API_SECRET ?? "";
  if (!apiKey || !secret) throw new SmoobuError(0, "Smoobu is not connected (SMOOBU_API_KEY / SMOOBU_API_SECRET missing).");
  const query = canonicalQuery(params);
  const bodyText = body === undefined ? "" : JSON.stringify(body);
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const nonce = crypto.randomUUID();
  const headers: Record<string, string> = {
    "X-API-Key": apiKey,
    "X-Timestamp": timestamp,
    "X-Nonce": nonce,
    "X-Signature": signRequest({ method, path, query, timestamp, nonce, body: bodyText, apiKey, secret }),
    "Cache-Control": "no-cache",
  };
  if (bodyText) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}${query ? `?${query}` : ""}`, { method, headers, body: bodyText || undefined, signal: AbortSignal.timeout(20_000) });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const j = json as { detail?: string; title?: string; validation_messages?: unknown } | null;
    const msg = j?.validation_messages ? JSON.stringify(j.validation_messages) : j?.detail || j?.title || text.slice(0, 200) || res.statusText;
    throw new SmoobuError(res.status, `Smoobu ${method} ${path} failed (${res.status}): ${msg}`, json);
  }
  return json as T;
}

// ---------------------------------------------------------------- API calls

export type SmoobuApartment = { id: number; name: string };

export async function listApartments(): Promise<SmoobuApartment[]> {
  const r = await call<{ apartments?: SmoobuApartment[] }>("GET", "/api/apartments");
  return (r.apartments ?? []).map((a) => ({ id: Number(a.id), name: String(a.name) }));
}

type RateDay = { price: number | null; min_length_of_stay: number | null; available: number | boolean | null };

async function getRates(apartmentIds: number[], start: string, end: string): Promise<Record<string, Record<string, RateDay>>> {
  const params: [string, string][] = apartmentIds.map((id) => ["apartments[]", String(id)]);
  params.push(["start_date", start], ["end_date", end]);
  const r = await call<{ data?: Record<string, Record<string, RateDay>> }>("GET", "/api/rates", params);
  return r.data ?? {};
}

// ---------------------------------------------------------------- local cache

type LinkedProperty = { id: number; smoobu_apartment_id: number };

function linkedProperties(propertyId?: number): LinkedProperty[] {
  const sql = "SELECT id, smoobu_apartment_id FROM properties WHERE smoobu_apartment_id IS NOT NULL" + (propertyId ? " AND id = ?" : "");
  return getDb()
    .prepare(sql)
    .all(...(propertyId ? [propertyId] : [])) as LinkedProperty[];
}

export function isLinked(propertyId: number): boolean {
  return smoobuEnabled() && linkedProperties(propertyId).length > 0;
}

/** Fetches rates for the given properties and date range (end inclusive) into smoobu_nights. */
async function syncRange(props: LinkedProperty[], start: string, end: string): Promise<number> {
  if (!props.length) return 0;
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO smoobu_nights (property_id, night, price, min_stay, available, fetched_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(property_id, night) DO UPDATE SET price = excluded.price, min_stay = excluded.min_stay, available = excluded.available, fetched_at = excluded.fetched_at`,
  );
  let rows = 0;
  // Smoobu allows 700 requests a minute; 90-day windows keep each response small.
  for (let from = start; from <= end; from = addDays(from, 90)) {
    const to = addDays(from, 89) < end ? addDays(from, 89) : end;
    const data = await getRates(
      props.map((p) => p.smoobu_apartment_id),
      from,
      to,
    );
    const fetched = nowIso();
    db.transaction(() => {
      for (const p of props) {
        const days = data[String(p.smoobu_apartment_id)] ?? {};
        for (let d = from; d <= to; d = addDays(d, 1)) {
          const day = days[d];
          const price = day && typeof day.price === "number" && day.price > 0 ? Math.round(day.price * 100) : null;
          const min = day && typeof day.min_length_of_stay === "number" && day.min_length_of_stay > 0 ? day.min_length_of_stay : null;
          // No price from Smoobu means we can't sell the night safely, so treat it as unavailable.
          const available = day && price !== null && (day.available === 1 || day.available === true) ? 1 : 0;
          upsert.run(p.id, d, price, min, available, fetched);
          rows++;
        }
      }
    })();
  }
  return rows;
}

export type SyncStatus = { lastRunAt: string | null; lastSuccessAt: string | null; error: string; nights: number; properties: number };

export function getSyncStatus(): SyncStatus {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(SYNC_KEY) as { value: string } | undefined;
  const base: SyncStatus = { lastRunAt: null, lastSuccessAt: null, error: "", nights: 0, properties: 0 };
  if (!row) return base;
  try {
    return { ...base, ...JSON.parse(row.value) };
  } catch {
    return base;
  }
}

function saveSyncStatus(s: SyncStatus) {
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(SYNC_KEY, JSON.stringify(s));
}

let running: Promise<SyncStatus> | null = null;

/** Full sync: every linked property, from today to the booking horizon. */
export function syncAll(): Promise<SyncStatus> {
  if (running) return running;
  running = (async () => {
    const prev = getSyncStatus();
    const status: SyncStatus = { ...prev, lastRunAt: nowIso() };
    try {
      if (!smoobuEnabled()) throw new Error("Smoobu is not connected yet.");
      const props = linkedProperties();
      const today = todayIn(getSetting("regional").timeZone);
      const end = addMonths(today, getSetting("booking").maxAdvanceMonths);
      status.nights = await syncRange(props, today, end);
      status.properties = props.length;
      status.lastSuccessAt = nowIso();
      status.error = "";
      getDb().prepare("DELETE FROM smoobu_nights WHERE night < ?").run(addDays(today, -2));
    } catch (e) {
      status.error = e instanceof Error ? e.message : String(e);
      console.error("[smoobu] sync failed:", status.error);
    }
    saveSyncStatus(status);
    return status;
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * Refreshes one property's nights just before a guest books, so a night
 * sold on Airbnb a minute ago is caught. Errors are swallowed: the cached
 * data from the last full sync is still used.
 */
export async function refreshForStay(propertyId: number, checkIn: string, checkOut: string): Promise<void> {
  if (!smoobuEnabled()) return;
  const props = linkedProperties(propertyId);
  if (!props.length) return;
  try {
    await syncRange(props, checkIn, addDays(checkOut, -1));
  } catch (e) {
    console.error("[smoobu] refresh before booking failed:", e instanceof Error ? e.message : e);
  }
}

export type SmoobuNight = { night: string; price: number | null; min_stay: number | null; available: number };

/** Cached Smoobu data for one linked property, or null when Smoobu isn't in use for it. */
export function smoobuNight(propertyId: number, night: string): SmoobuNight | null {
  if (!smoobuEnabled()) return null;
  return (
    (getDb().prepare("SELECT night, price, min_stay, available FROM smoobu_nights WHERE property_id = ? AND night = ?").get(propertyId, night) as
      | SmoobuNight
      | undefined) ?? null
  );
}

/** Nights Smoobu says are not bookable (sold elsewhere, blocked, or with no price). */
export function smoobuUnavailableNights(propertyId: number, from: string, to: string): string[] {
  if (!isLinked(propertyId)) return [];
  return (
    getDb().prepare("SELECT night FROM smoobu_nights WHERE property_id = ? AND night >= ? AND night < ? AND available = 0 ORDER BY night").all(propertyId, from, to) as {
      night: string;
    }[]
  ).map((r) => r.night);
}

// ---------------------------------------------------------------- bookings

type PushableBooking = {
  id: number;
  property_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_message: string;
  reference: string;
  total: number;
  amount_paid: number;
  status: string;
  payment_mode: string;
  source: string;
  is_demo: number;
  smoobu_reservation_id: number | null;
};

function event(bookingId: number, message: string) {
  getDb().prepare("INSERT INTO booking_events (booking_id, message) VALUES (?, ?)").run(bookingId, message);
}

/**
 * Sends a confirmed website booking to Smoobu. Demo bookings, manual
 * bookings (which may have come from Airbnb already) and unlinked homes are
 * never sent. Failures are recorded on the booking for the owner to see.
 */
export async function pushBooking(bookingId: number): Promise<void> {
  if (!smoobuEnabled()) return;
  const db = getDb();
  const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId) as PushableBooking | undefined;
  if (!b || b.status !== "confirmed" || b.smoobu_reservation_id || b.is_demo || b.payment_mode === "demo" || b.source !== "website") return;
  const link = linkedProperties(b.property_id)[0];
  if (!link) return;
  const p = db.prepare("SELECT check_in_time, check_out_time FROM properties WHERE id = ?").get(b.property_id) as { check_in_time: string; check_out_time: string };
  const [firstName, ...rest] = b.guest_name.trim().split(/\s+/);
  try {
    const r = await call<{ id: number }>("POST", "/api/reservations", [], {
      arrivalDate: b.check_in,
      departureDate: b.check_out,
      channelId: CHANNEL_ID,
      apartmentId: link.smoobu_apartment_id,
      arrivalTime: p.check_in_time,
      departureTime: p.check_out_time,
      firstName,
      lastName: rest.join(" ") || firstName,
      email: b.guest_email,
      phone: b.guest_phone,
      notice: `Website booking ${b.reference}${b.guest_message ? `. Guest note: ${b.guest_message}` : ""}`,
      adults: b.adults,
      children: b.children,
      price: b.total / 100,
      priceStatus: b.amount_paid >= b.total ? 1 : 0,
      language: "en",
    });
    db.prepare("UPDATE bookings SET smoobu_reservation_id = ?, updated_at = ? WHERE id = ?").run(r.id, nowIso(), b.id);
    event(b.id, `Sent to Smoobu (reservation ${r.id}). The dates are now blocked on your other channels.`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[smoobu] push failed:", msg);
    db.prepare("UPDATE bookings SET needs_attention = ?, updated_at = ? WHERE id = ?").run(
      `Could not add this booking to Smoobu, so the dates may still be open on Airbnb. Add it in Smoobu by hand. (${msg})`,
      nowIso(),
      b.id,
    );
    event(b.id, `Sending to Smoobu failed: ${msg}`);
  }
}

/** Cancels the matching Smoobu reservation, if this booking was sent there. */
export async function cancelInSmoobu(bookingId: number): Promise<void> {
  if (!smoobuEnabled()) return;
  const db = getDb();
  const b = db.prepare("SELECT id, smoobu_reservation_id FROM bookings WHERE id = ?").get(bookingId) as { id: number; smoobu_reservation_id: number | null } | undefined;
  if (!b?.smoobu_reservation_id) return;
  try {
    await call("DELETE", `/api/reservations/${b.smoobu_reservation_id}`);
    event(b.id, `Cancelled in Smoobu (reservation ${b.smoobu_reservation_id}).`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    db.prepare("UPDATE bookings SET needs_attention = ?, updated_at = ? WHERE id = ?").run(
      `Could not cancel reservation ${b.smoobu_reservation_id} in Smoobu. Cancel it there by hand so the dates reopen. (${msg})`,
      nowIso(),
      b.id,
    );
    event(b.id, `Cancelling in Smoobu failed: ${msg}`);
  }
}
