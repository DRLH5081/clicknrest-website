import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite database (single file, persistent on disk).
 *
 * Every booked or blocked night is a row in `booking_nights` with a UNIQUE
 * (property_id, night) constraint, so two reservations can never hold the
 * same night — even if two guests press "Book" at the same moment.
 */

export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || path.join(process.cwd(), "data"));
const DB_PATH = process.env.DATABASE_PATH ? path.resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH) : path.join(DATA_DIR, "faron.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  property_type TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  town TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  area_info TEXT NOT NULL DEFAULT '',
  bedrooms INTEGER NOT NULL DEFAULT 1,
  beds INTEGER NOT NULL DEFAULT 1,
  bathrooms REAL NOT NULL DEFAULT 1,
  max_guests INTEGER NOT NULL DEFAULT 2,
  amenities TEXT NOT NULL DEFAULT '[]',
  base_rate INTEGER NOT NULL DEFAULT 10000,
  weekend_rate INTEGER,
  cleaning_fee INTEGER NOT NULL DEFAULT 0,
  min_nights INTEGER NOT NULL DEFAULT 1,
  max_nights INTEGER NOT NULL DEFAULT 28,
  check_in_time TEXT NOT NULL DEFAULT '15:00',
  check_out_time TEXT NOT NULL DEFAULT '10:00',
  check_in_info TEXT NOT NULL DEFAULT '',
  house_rules TEXT NOT NULL DEFAULT '',
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS property_images (
  id INTEGER PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  media_key TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_images_property ON property_images(property_id, sort_order);

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  nightly_rate INTEGER NOT NULL,
  min_nights INTEGER
);
CREATE INDEX IF NOT EXISTS idx_seasons_property ON seasons(property_id, start_date);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  access_token_hash TEXT NOT NULL,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  nights INTEGER NOT NULL,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL DEFAULT '',
  guest_message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','cancelled','expired')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','partially_refunded','refunded','failed','paid_offline')),
  payment_mode TEXT NOT NULL DEFAULT 'demo' CHECK (payment_mode IN ('demo','stripe','manual')),
  source TEXT NOT NULL DEFAULT 'website',
  currency TEXT NOT NULL,
  accommodation_total INTEGER NOT NULL,
  cleaning_fee INTEGER NOT NULL,
  tax_total INTEGER NOT NULL,
  tax_mode TEXT NOT NULL DEFAULT 'included',
  total INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  amount_refunded INTEGER NOT NULL DEFAULT 0,
  price_breakdown TEXT NOT NULL DEFAULT '{}',
  hold_expires_at TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  cancellation_requested_at TEXT,
  cancellation_reason TEXT NOT NULL DEFAULT '',
  cancelled_at TEXT,
  admin_notes TEXT NOT NULL DEFAULT '',
  needs_attention TEXT NOT NULL DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates ON bookings(property_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, hold_expires_at);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_nights (
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  night TEXT NOT NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, night)
);
CREATE INDEX IF NOT EXISTS idx_nights_booking ON booking_nights(booking_id);
CREATE INDEX IF NOT EXISTS idx_nights_block ON booking_nights(block_id);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('charge','refund')),
  amount INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'succeeded',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  is_draft_content INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  dates TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id INTEGER PRIMARY KEY,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  text_body TEXT NOT NULL,
  html_body TEXT NOT NULL,
  transport TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT NOT NULL DEFAULT '',
  booking_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smoobu_nights (
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  night TEXT NOT NULL,
  price INTEGER,
  min_stay INTEGER,
  available INTEGER NOT NULL DEFAULT 1,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (property_id, night)
);

CREATE TABLE IF NOT EXISTS media (
  key TEXT PRIMARY KEY,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  original_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

type GlobalWithDb = typeof globalThis & { __faronDb?: Database.Database };

/** Adds columns introduced after the first release, so existing databases keep working. */
function migrate(db: Database.Database) {
  const has = (table: string, column: string) => (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
  if (!has("bookings", "payment_method")) db.exec("ALTER TABLE bookings ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'card'");
  if (!has("properties", "smoobu_apartment_id")) db.exec("ALTER TABLE properties ADD COLUMN smoobu_apartment_id INTEGER");
  if (!has("bookings", "smoobu_reservation_id")) db.exec("ALTER TABLE bookings ADD COLUMN smoobu_reservation_id INTEGER");
}

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

export function getDb(): Database.Database {
  const g = globalThis as GlobalWithDb;
  if (!g.__faronDb) g.__faronDb = open();
  return g.__faronDb;
}

export function nowIso(): string {
  return new Date().toISOString();
}
