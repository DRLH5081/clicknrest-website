import Database from "better-sqlite3";
import { LAUNCH_CONTENT_VERSION, HOUSE_RULES, BALCONY_RULES, LEGAL_PAGES, CANCELLATION_FAQ, CANCELLATION, PHOTO_SWAPS, HOME_COPY, ABOUT_PAGE, FAQ_UPDATES, LOCKBOX_SLUGS, CHECK_IN_FORM_TEXT, checkInInfoFor, CHECK_IN_FAQ } from "../content/launch";
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
  applyLaunchContent(db);
}

/** One-off: brings an existing database up to the owner-approved house rules, cancellation rules and legal pages. */
function applyLaunchContent(db: Database.Database) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'launch_content_version'").get() as { value: string } | undefined;
  const v = Number(row?.value ?? 0);
  if (v >= LAUNCH_CONTENT_VERSION) return;
  db.transaction(() => {
    if (v < 3) {
      db.prepare("UPDATE properties SET house_rules = ?, updated_at = datetime('now')").run(HOUSE_RULES);
      db.prepare("UPDATE properties SET house_rules = ? WHERE slug = 'wembley-stadium-view-apartment'").run(`${HOUSE_RULES}\n${BALCONY_RULES}`);
      const upsertPage = db.prepare(
        `INSERT INTO pages (slug, title, body, meta_title, meta_description, is_draft_content, updated_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET title = excluded.title, body = excluded.body, meta_title = excluded.meta_title, meta_description = excluded.meta_description, is_draft_content = 0, updated_at = excluded.updated_at`,
      );
      for (const p of LEGAL_PAGES) upsertPage.run(p.slug, p.title, p.body, p.meta_title, p.meta_description);
      const booking = db.prepare("SELECT value FROM settings WHERE key = 'booking'").get() as { value: string } | undefined;
      if (booking) {
        let cur = {};
        try {
          cur = JSON.parse(booking.value);
        } catch {}
        db.prepare("UPDATE settings SET value = ? WHERE key = 'booking'").run(JSON.stringify({ ...cur, ...CANCELLATION }));
      }
      db.prepare("UPDATE faqs SET answer = ? WHERE question = 'What is your cancellation policy?'").run(CANCELLATION_FAQ);
    }
    const readHome = () => {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'home'").get() as { value: string } | undefined;
      if (!row) return null;
      try {
        return JSON.parse(row.value);
      } catch {
        return null;
      }
    };
    const saveHome = (h: unknown) => db.prepare("UPDATE settings SET value = ? WHERE key = 'home'").run(JSON.stringify(h));
    if (v < 4) {
      const h = readHome();
      if (h) {
        const swap = (k: unknown) => (typeof k === "string" && PHOTO_SWAPS[k]) || k;
        h.heroImage = swap(h.heroImage);
        h.introImage = swap(h.introImage);
        if (Array.isArray(h.experiences)) h.experiences = h.experiences.map((x: { image?: string }) => ({ ...x, image: swap(x.image) }));
        for (const f of ["heroIntro", "ctaBody"]) if (typeof h[f] === "string") h[f] = h[f].replace("Ten self-catering", "Nine self-catering").replace("all ten apartments", "all nine apartments");
        saveHome(h);
      }
    }
    if (v < 5) {
      // Replace only text that is still placeholder wording, so the owner's own edits are kept.
      const isPlaceholder = (t: unknown) => typeof t === "string" && /placeholder/i.test(t);
      const h = readHome();
      if (h) {
        if (isPlaceholder(h.heroIntro)) h.heroIntro = HOME_COPY.heroIntro;
        if (isPlaceholder(h.introBody)) h.introBody = HOME_COPY.introBody;
        if (isPlaceholder(h.experiencesIntro)) h.experiencesIntro = HOME_COPY.experiencesIntro;
        if (Array.isArray(h.experiences))
          h.experiences = h.experiences.map((x: { body?: string }, i: number) => (isPlaceholder(x.body) && HOME_COPY.experienceBodies[i] ? { ...x, body: HOME_COPY.experienceBodies[i] } : x));
        saveHome(h);
      }
      const about = db.prepare("SELECT body, meta_description FROM pages WHERE slug = 'about'").get() as { body: string; meta_description: string } | undefined;
      if (about && isPlaceholder(about.body)) db.prepare("UPDATE pages SET body = ?, is_draft_content = 0, updated_at = datetime('now') WHERE slug = 'about'").run(ABOUT_PAGE.body);
      if (about && isPlaceholder(about.meta_description)) db.prepare("UPDATE pages SET meta_description = ? WHERE slug = 'about'").run(ABOUT_PAGE.meta_description);
      const faq = db.prepare("SELECT id, answer FROM faqs WHERE question = ?");
      for (const u of FAQ_UPDATES) {
        const f = faq.get(u.match) as { id: number; answer: string } | undefined;
        // Only the seeded answers: the payment one mentions Pay by Bank, the pets one a filter no apartment uses.
        if (f && (isPlaceholder(f.answer) || /Pay by Bank|Dogs welcome/.test(f.answer))) db.prepare("UPDATE faqs SET question = ?, answer = ? WHERE id = ?").run(u.q, u.a, f.id);
      }
    }
    if (v < 6) {
      // New public phone number (owner, 2026-11-27); only replaces the old temporary number.
      const row = db.prepare("SELECT value FROM settings WHERE key = 'site'").get() as { value: string } | undefined;
      if (row) {
        try {
          const site = JSON.parse(row.value);
          if (typeof site.contactPhone === "string" && site.contactPhone.replace(/\s/g, "") === "07485531484") {
            site.contactPhone = "07385 772508";
            db.prepare("UPDATE settings SET value = ? WHERE key = 'site'").run(JSON.stringify(site));
          }
        } catch {}
      }
    }
    if (v < 7) {
      // Check-in arrangements by building: lockbox in Cockfosters and Hounslow, concierge in Wembley and Harrow (client, 2026-11-28).
      const props = db.prepare("SELECT id, slug, amenities, check_in_info FROM properties").all() as { id: number; slug: string; amenities: string; check_in_info: string }[];
      for (const p of props) {
        let am: string[] = [];
        try {
          am = JSON.parse(p.amenities);
        } catch {}
        const lockbox = LOCKBOX_SLUGS.includes(p.slug);
        am = am.filter((a) => a !== "self_check_in" && a !== "concierge");
        am.splice(Math.min(4, am.length), 0, lockbox ? "self_check_in" : "concierge");
        // Keep any check-in text the owner wrote; replace only the shared form text the site was seeded with.
        const info = p.check_in_info.trim() === CHECK_IN_FORM_TEXT || p.check_in_info.trim() === "" ? checkInInfoFor(p.slug) : p.check_in_info;
        db.prepare("UPDATE properties SET amenities = ?, check_in_info = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(am), info, p.id);
      }
      db.prepare("UPDATE faqs SET answer = ? WHERE question = 'What time are check-in and check-out?' AND answer LIKE 'Check-in is from 3pm (15:00) and check-out is by 10am (10:00) at all our homes%'").run(CHECK_IN_FAQ);
      const h = readHome();
      if (h) {
        if (typeof h.heroIntro === "string") h.heroIntro = h.heroIntro.replace("with fast Wi-Fi, self check-in and no booking fees", "with fast Wi-Fi, easy check-in from 3pm and no booking fees");
        if (typeof h.introBody === "string") h.introBody = h.introBody.replace("fresh linen and towels, and self check-in from 3pm.", "fresh linen and towels, and check-in from 3pm.");
        saveHome(h);
      }
      const about = db.prepare("SELECT body FROM pages WHERE slug = 'about'").get() as { body: string } | undefined;
      if (about) {
        const body = about.body
          .replace("with a fully equipped kitchen, fast Wi-Fi and self check-in, so you can settle in from 3pm without waiting around for keys.", "with a fully equipped kitchen, fast Wi-Fi and check-in from 3pm.")
          .replace(
            "- A quick online check-in before your stay, then self check-in on the day.",
            "- A quick online check-in before your stay, then collect your keys from a lockbox or the building's concierge.\n- Earlier check-in or later check-out can often be arranged for £15 per hour. Just message us.",
          );
        if (body !== about.body) db.prepare("UPDATE pages SET body = ?, updated_at = datetime('now') WHERE slug = 'about'").run(body);
      }
    }
    db.prepare("INSERT INTO settings (key, value) VALUES ('launch_content_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(LAUNCH_CONTENT_VERSION));
  })();
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
