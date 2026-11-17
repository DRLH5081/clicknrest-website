/**
 * Creates the database and fills it with DEMONSTRATION content.
 *
 *   npm run db:seed     # only seeds an empty database
 *   npm run db:reset    # deletes the database and uploads, then re-seeds
 *   npm run db:live     # real launch: properties, FAQs and pages only, no demo bookings (empty database only)
 *
 * Admin login comes from ADMIN_EMAIL / ADMIN_PASSWORD, or defaults to
 * owner@example.com / change-me-now (you'll be asked to change it).
 */
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, getDb } from "../src/lib/db";
import { storeImage, UPLOAD_DIR } from "../src/lib/media";
import { hashPassword, randomToken, sha256, bookingReference } from "../src/lib/tokens";
import { DEFAULTS, setSetting } from "../src/lib/settings";
import { addDays, nightsBetween, todayIn } from "../src/lib/dates";
import { getPropertyById } from "../src/lib/properties";
import { priceStay } from "../src/lib/pricing";
import { seedProperties, SEED_FAQS, SEED_PAGES, DEMO_GUESTS } from "./seed-data";

const reset = process.argv.includes("--reset");
const live = process.argv.includes("--live");
if (reset && live) throw new Error("--live never wipes data. Run it on an empty database.");
const IMAGES_DIR = path.join(process.cwd(), "seed-images");

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (reset) {
    for (const f of fs.readdirSync(DATA_DIR, { withFileTypes: true }).filter((f) => f.name.startsWith("faron.db"))) fs.rmSync(path.join(DATA_DIR, f.name));
    fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
    console.log("Removed existing database and uploads.");
  }
  const db = getDb();
  const existing = (db.prepare("SELECT COUNT(*) c FROM properties").get() as { c: number }).c;
  if (existing > 0) {
    console.log("Database already has properties; nothing to do. Use `npm run db:reset` to start again.");
    return;
  }

  // ---- settings
  for (const key of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) setSetting(key, DEFAULTS[key] as never);

  // ---- admin user
  const email = (process.env.ADMIN_EMAIL || "owner@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "change-me-now";
  db.prepare("INSERT INTO admin_users (email, name, password_hash, must_change_password) VALUES (?, ?, ?, ?)").run(
    email,
    "Owner",
    hashPassword(password),
    process.env.ADMIN_PASSWORD ? 0 : 1,
  );

  // ---- images
  const imageFiles = fs.readdirSync(IMAGES_DIR).filter((f) => f.endsWith(".jpg"));
  for (const f of imageFiles) {
    const key = f.replace(/\.jpg$/, "");
    await storeImage(fs.readFileSync(path.join(IMAGES_DIR, f)), f, key);
  }
  console.log(`Processed ${imageFiles.length} placeholder images.`);

  // ---- properties
  const today = todayIn("Europe/London");
  const year = Number(today.slice(0, 4));
  const props = seedProperties(year);
  const insertProp = db.prepare(`INSERT INTO properties (slug, name, status, featured, sort_order, property_type, summary, description, town, region,
    latitude, longitude, area_info, bedrooms, beds, bathrooms, max_guests, amenities, base_rate, weekend_rate, cleaning_fee, min_nights,
    check_in_time, check_out_time, check_in_info, house_rules, meta_title, meta_description, is_demo)
    VALUES (@slug, @name, 'published', @featured, @sort_order, @property_type, @summary, @description, @town, @region, @latitude, @longitude,
    @area_info, @bedrooms, @beds, @bathrooms, @max_guests, @amenities, @base_rate, @weekend_rate, @cleaning_fee, @min_nights,
    @check_in_time, @check_out_time, @check_in_info, @house_rules, @meta_title, @meta_description, @is_demo)`);
  const insertImg = db.prepare("INSERT INTO property_images (property_id, media_key, alt, sort_order, width, height) VALUES (?, ?, ?, ?, ?, ?)");
  const insertSeason = db.prepare("INSERT INTO seasons (property_id, name, start_date, end_date, nightly_rate, min_nights) VALUES (?, ?, ?, ?, ?, ?)");
  const ids: number[] = [];
  props.forEach((p, i) => {
    const info = insertProp.run({
      ...p,
      sort_order: i,
      amenities: JSON.stringify(p.amenities),
      meta_title: `${p.name} · ${p.town}, ${p.region}`,
      meta_description: p.summary.replace(/^Placeholder summary: /, ""),
      is_demo: live ? 0 : 1,
    });
    const id = Number(info.lastInsertRowid);
    ids.push(id);
    p.images.forEach((img, j) => {
      const m = db.prepare("SELECT width, height FROM media WHERE key = ?").get(img.file) as { width: number; height: number };
      insertImg.run(id, img.file, img.alt, j, m.width, m.height);
    });
    for (const s of p.seasons) insertSeason.run(id, s.name, s.start, s.end, s.rate, s.min ?? null);
  });

  // ---- FAQs & pages
  SEED_FAQS.forEach((f, i) => db.prepare("INSERT INTO faqs (question, answer, category, sort_order) VALUES (?, ?, ?, ?)").run(f.q, f.a, f.c, i));
  for (const p of SEED_PAGES) {
    db.prepare("INSERT INTO pages (slug, title, body, meta_title, meta_description, is_draft_content) VALUES (?, ?, ?, ?, ?, ?)").run(
      p.slug,
      p.title,
      p.body,
      p.meta_title,
      p.meta_description,
      p.is_draft,
    );
  }

  if (live) {
    console.log(`Seeded ${ids.length} properties, ${SEED_FAQS.length} FAQs and ${SEED_PAGES.length} pages for launch (no demo bookings).`);
    console.log(`Admin login: ${email} / ${process.env.ADMIN_PASSWORD ? "(from ADMIN_PASSWORD)" : password}`);
    return;
  }

  // ---- demo bookings (clearly flagged is_demo = 1)
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let guestIdx = 0;
  const insertBooking = db.prepare(`INSERT INTO bookings (reference, access_token_hash, property_id, check_in, check_out, nights, adults, children,
      guest_name, guest_email, guest_phone, guest_message, status, payment_status, payment_mode, source, currency, accommodation_total, cleaning_fee,
      tax_total, tax_mode, total, amount_paid, amount_refunded, price_breakdown, cancellation_requested_at, cancellation_reason, cancelled_at, is_demo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`);
  const insertNight = db.prepare("INSERT INTO booking_nights (property_id, night, booking_id) VALUES (?, ?, ?)");
  const insertPayment = db.prepare("INSERT INTO payments (booking_id, kind, amount, provider, provider_ref, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const insertEvent = db.prepare("INSERT INTO booking_events (booking_id, message, actor, created_at) VALUES (?, ?, ?, ?)");
  let count = 0;
  let madeRequest = false;
  let madePhone = false;

  const tx = db.transaction(() => {
    ids.forEach((pid) => {
      const p = getPropertyById(pid)!;
      let d = addDays(today, -320 + Math.floor(rand() * 10));
      const end = addDays(today, 150);
      while (d < end) {
        const future = d >= today;
        const occupancy = future ? 0.45 - (Number(new Date(d).getTime() - new Date(today).getTime()) / 86400000 / 150) * 0.3 : 0.62;
        if (rand() < occupancy) {
          const len = Math.max(p.min_nights, 2 + Math.floor(rand() * 6));
          const checkIn = d;
          const checkOut = addDays(d, len);
          const guests = Math.max(1, Math.min(p.max_guests, 1 + Math.floor(rand() * p.max_guests)));
          const b = priceStay(p, checkIn, checkOut);
          const name = DEMO_GUESTS[guestIdx++ % DEMO_GUESTS.length];
          const createdAt = addDays(checkIn, -(10 + Math.floor(rand() * 70))) + "T10:15:00.000Z";
          let status = "confirmed";
          let paymentStatus = "paid";
          let refunded = 0;
          let mode = "demo";
          let source = "website";
          let cancelReq: string | null = null;
          let cancelReason = "";
          let cancelledAt: string | null = null;
          const r = rand();
          if (!future && r < 0.06) {
            status = "cancelled";
            paymentStatus = "refunded";
            refunded = b.total;
            cancelledAt = addDays(checkIn, -35) + "T09:00:00.000Z";
          } else if (future && !madeRequest && d > addDays(today, 20)) {
            madeRequest = true;
            cancelReq = new Date().toISOString();
            cancelReason = "Placeholder reason: change of plans.";
          } else if (future && !madePhone && r < 0.3) {
            madePhone = true;
            mode = "manual";
            source = "phone";
            paymentStatus = "unpaid";
          }
          const info = insertBooking.run(
            bookingReference(),
            sha256(randomToken()),
            pid,
            checkIn,
            checkOut,
            len,
            Math.max(1, guests - (guests > 2 ? 1 : 0)),
            guests > 2 ? 1 : 0,
            `${name} (demo)`,
            `guest${guestIdx}@example.com`,
            "07700 900" + String(100 + guestIdx).slice(-3),
            status,
            paymentStatus,
            mode,
            source,
            b.currency,
            b.accommodation,
            b.cleaningFee,
            b.tax.amount,
            b.tax.mode,
            b.total,
            paymentStatus === "unpaid" ? 0 : b.total,
            refunded,
            JSON.stringify(b),
            cancelReq,
            cancelReason,
            cancelledAt,
            createdAt,
            createdAt,
          );
          const bid = Number(info.lastInsertRowid);
          if (status === "confirmed") for (const n of nightsBetween(checkIn, checkOut)) insertNight.run(pid, n, bid);
          if (paymentStatus !== "unpaid") insertPayment.run(bid, "charge", b.total, mode, "demo_seed", "Demonstration data. No money was taken.", createdAt);
          if (refunded) insertPayment.run(bid, "refund", refunded, "demo", "demo_seed", "Demonstration data.", cancelledAt);
          insertEvent.run(bid, "Demonstration booking created by the seed script.", "system", createdAt);
          if (cancelReq) insertEvent.run(bid, `Guest requested cancellation: “${cancelReason}”`, "guest", cancelReq);
          count++;
          d = addDays(checkOut, Math.floor(rand() * 4));
        } else {
          d = addDays(d, 1 + Math.floor(rand() * 5));
        }
      }
    });
    // A maintenance block on one property
    const blockStart = addDays(today, 45);
    let s = blockStart;
    while (db.prepare("SELECT 1 FROM booking_nights WHERE property_id = ? AND night >= ? AND night < ?").get(ids[2], s, addDays(s, 4))) s = addDays(s, 1);
    const blk = db.prepare("INSERT INTO blocks (property_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)").run(ids[2], s, addDays(s, 4), "Maintenance (demo)");
    for (const n of nightsBetween(s, addDays(s, 4))) insertNight.run(ids[2], n, blk.lastInsertRowid);
  });
  tx();

  db.prepare("INSERT INTO enquiries (name, email, phone, property_id, dates, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "Pat Example (demo)",
    "pat@example.com",
    "",
    ids[4],
    "Next spring, 4 nights",
    "Placeholder enquiry: is the lodge suitable for a family reunion of ten with two dogs?",
    new Date(Date.now() - 86400000).toISOString(),
  );

  console.log(`Seeded ${ids.length} demo properties, ${count} demo bookings, ${SEED_FAQS.length} FAQs and ${SEED_PAGES.length} pages.`);
  console.log(`Admin login: ${email} / ${process.env.ADMIN_PASSWORD ? "(from ADMIN_PASSWORD)" : password}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
