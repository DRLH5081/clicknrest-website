"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb, nowIso } from "@/lib/db";
import { slugify, parseMoney } from "@/lib/format";
import { isIsoDate, addDays } from "@/lib/dates";
import { AMENITY_MAP } from "@/lib/amenities";
import { storeImage, deleteMediaFiles } from "@/lib/media";
import { getSetting, setSetting, type HomeContent, type TaxSettings } from "@/lib/settings";
import {
  BookingError,
  cancelBooking,
  confirmPaidBooking,
  createBlock,
  createManualBooking,
  deleteBlock,
  extendHold,
  getBookingByRef,
  getBookingById,
  logEvent,
  recordRefund,
  rotateAccessToken,
} from "@/lib/bookings";
import { refundPayment } from "@/lib/payments";
import { sendBookingConfirmation, sendCancellationEmails, sendRefundEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/tokens";

// ------------------------------------------------------------------ helpers

function go(path: string, msg: { ok?: string; error?: string } = {}): never {
  const [base, existing] = path.split("?");
  const q = new URLSearchParams(existing);
  if (msg.ok) q.set("ok", msg.ok);
  if (msg.error) q.set("error", msg.error);
  const qs = q.toString();
  redirect(qs ? `${base}?${qs}` : base);
}

const str = (fd: FormData, k: string, max = 5000) => String(fd.get(k) ?? "").trim().slice(0, max);
const int = (fd: FormData, k: string, fallback = 0) => {
  const n = Number(fd.get(k));
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const files = (fd: FormData, k: string) => fd.getAll(k).filter((f): f is File => f instanceof File && f.size > 0);

function refreshPublic() {
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------ properties

const PropertyInput = z.object({
  name: z.string().min(2, "Name is required").max(120),
  slug: z.string().max(80),
  property_type: z.string().max(80),
  summary: z.string().max(400),
  description: z.string().max(20000),
  town: z.string().min(1, "Town is required").max(80),
  region: z.string().min(1, "Region is required").max(80),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  area_info: z.string().max(5000),
  bedrooms: z.number().int().min(0).max(50),
  beds: z.number().int().min(0).max(100),
  bathrooms: z.number().min(0).max(50),
  max_guests: z.number().int().min(1, "Guests must be at least 1").max(100),
  check_in_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  check_out_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  check_in_info: z.string().max(3000),
  house_rules: z.string().max(5000),
  meta_title: z.string().max(120),
  meta_description: z.string().max(300),
  featured: z.number().int().min(0).max(1),
});

export async function saveProperty(id: number | null, formData: FormData) {
  await requireAdmin();
  const lat = str(formData, "latitude");
  const lng = str(formData, "longitude");
  const parsed = PropertyInput.safeParse({
    name: str(formData, "name", 120),
    slug: slugify(str(formData, "slug") || str(formData, "name")),
    property_type: str(formData, "property_type"),
    summary: str(formData, "summary"),
    description: str(formData, "description", 20000),
    town: str(formData, "town"),
    region: str(formData, "region"),
    latitude: lat ? Number(lat) : null,
    longitude: lng ? Number(lng) : null,
    area_info: str(formData, "area_info"),
    bedrooms: int(formData, "bedrooms"),
    beds: int(formData, "beds"),
    bathrooms: Number(formData.get("bathrooms") || 0),
    max_guests: int(formData, "max_guests", 1),
    check_in_time: str(formData, "check_in_time"),
    check_out_time: str(formData, "check_out_time"),
    check_in_info: str(formData, "check_in_info"),
    house_rules: str(formData, "house_rules"),
    meta_title: str(formData, "meta_title"),
    meta_description: str(formData, "meta_description"),
    featured: formData.get("featured") ? 1 : 0,
  });
  const back = id ? `/admin/properties/${id}` : "/admin/properties/new";
  if (!parsed.success) go(back, { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(". ") });
  const d = parsed.data;
  if (!d.slug) go(back, { error: "Please provide a web address (slug)." });
  const db = getDb();
  const clash = db.prepare("SELECT id FROM properties WHERE slug = ? AND id != ?").get(d.slug, id ?? -1);
  if (clash) go(back, { error: `The web address “/stays/${d.slug}” is already used by another property.` });
  const amenities = JSON.stringify(formData.getAll("amenities").map(String).filter((a) => AMENITY_MAP.has(a)));

  if (id) {
    db.prepare(
      `UPDATE properties SET name=@name, slug=@slug, property_type=@property_type, summary=@summary, description=@description, town=@town, region=@region,
        latitude=@latitude, longitude=@longitude, area_info=@area_info, bedrooms=@bedrooms, beds=@beds, bathrooms=@bathrooms, max_guests=@max_guests,
        check_in_time=@check_in_time, check_out_time=@check_out_time, check_in_info=@check_in_info, house_rules=@house_rules,
        meta_title=@meta_title, meta_description=@meta_description, featured=@featured, amenities=@amenities, updated_at=@now WHERE id=@id`,
    ).run({ ...d, amenities, now: nowIso(), id });
    refreshPublic();
    go(`/admin/properties/${id}`, { ok: "Property saved." });
  } else {
    const order = (db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM properties").get() as { n: number }).n;
    const info = db
      .prepare(
        `INSERT INTO properties (name, slug, status, property_type, summary, description, town, region, latitude, longitude, area_info, bedrooms, beds,
          bathrooms, max_guests, check_in_time, check_out_time, check_in_info, house_rules, meta_title, meta_description, featured, amenities, sort_order)
         VALUES (@name, @slug, 'draft', @property_type, @summary, @description, @town, @region, @latitude, @longitude, @area_info, @bedrooms, @beds,
          @bathrooms, @max_guests, @check_in_time, @check_out_time, @check_in_info, @house_rules, @meta_title, @meta_description, @featured, @amenities, @order)`,
      )
      .run({ ...d, amenities, order });
    go(`/admin/properties/${info.lastInsertRowid}?tab=pricing`, { ok: "Property created as a draft. Next, set prices and add photos, then publish." });
  }
}

export async function setPropertyStatus(id: number, status: "draft" | "published" | "archived") {
  await requireAdmin();
  const db = getDb();
  if (status === "published") {
    const imgs = (db.prepare("SELECT COUNT(*) c FROM property_images WHERE property_id = ?").get(id) as { c: number }).c;
    if (imgs === 0) go(`/admin/properties/${id}?tab=photos`, { error: "Add at least one photo before publishing." });
  }
  db.prepare("UPDATE properties SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
  refreshPublic();
  go(`/admin/properties/${id}`, { ok: status === "published" ? "Property is now live on the website." : status === "archived" ? "Property archived and hidden from the website. Existing bookings are kept." : "Property moved to draft and hidden from the website." });
}

export async function moveProperty(id: number, dir: "up" | "down") {
  await requireAdmin();
  const db = getDb();
  const rows = db.prepare("SELECT id FROM properties ORDER BY sort_order, name").all() as { id: number }[];
  const i = rows.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < rows.length) [rows[i], rows[j]] = [rows[j], rows[i]];
  const upd = db.prepare("UPDATE properties SET sort_order = ? WHERE id = ?");
  db.transaction(() => rows.forEach((r, k) => upd.run(k, r.id)))();
  refreshPublic();
  go("/admin/properties");
}

export async function savePricing(id: number, formData: FormData) {
  await requireAdmin();
  const base = parseMoney(str(formData, "base_rate"));
  const weekend = str(formData, "weekend_rate") ? parseMoney(str(formData, "weekend_rate")) : null;
  const cleaning = parseMoney(str(formData, "cleaning_fee") || "0");
  const minN = int(formData, "min_nights", 1);
  const maxN = int(formData, "max_nights", 28);
  const back = `/admin/properties/${id}?tab=pricing`;
  if (base == null || base <= 0) go(back, { error: "Please enter a nightly rate above zero." });
  if (cleaning == null || cleaning < 0) go(back, { error: "Cleaning fee can't be negative." });
  if (minN < 1 || maxN < minN) go(back, { error: "Minimum stay must be at least 1 night and no more than the maximum stay." });
  getDb()
    .prepare("UPDATE properties SET base_rate = ?, weekend_rate = ?, cleaning_fee = ?, min_nights = ?, max_nights = ?, updated_at = ? WHERE id = ?")
    .run(base, weekend && weekend > 0 ? weekend : null, cleaning, minN, maxN, nowIso(), id);
  refreshPublic();
  go(back, { ok: "Pricing saved." });
}

export async function saveSeason(propertyId: number, seasonId: number | null, formData: FormData) {
  await requireAdmin();
  const back = `/admin/properties/${propertyId}?tab=pricing`;
  const name = str(formData, "name", 80) || "Season";
  const start = str(formData, "start_date");
  const end = str(formData, "end_date");
  const rate = parseMoney(str(formData, "nightly_rate"));
  const minRaw = str(formData, "min_nights");
  const min = minRaw ? Math.max(1, Math.round(Number(minRaw))) : null;
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) go(back, { error: "Season dates are invalid: the last night must be on or after the first night." });
  if (rate == null || rate <= 0) go(back, { error: "Season nightly rate must be above zero." });
  const db = getDb();
  if (seasonId) {
    db.prepare("UPDATE seasons SET name=?, start_date=?, end_date=?, nightly_rate=?, min_nights=? WHERE id=? AND property_id=?").run(name, start, end, rate, min, seasonId, propertyId);
  } else {
    db.prepare("INSERT INTO seasons (property_id, name, start_date, end_date, nightly_rate, min_nights) VALUES (?, ?, ?, ?, ?, ?)").run(propertyId, name, start, end, rate, min);
  }
  refreshPublic();
  go(back, { ok: `Season “${name}” saved.` });
}

export async function deleteSeason(propertyId: number, seasonId: number) {
  await requireAdmin();
  getDb().prepare("DELETE FROM seasons WHERE id = ? AND property_id = ?").run(seasonId, propertyId);
  refreshPublic();
  go(`/admin/properties/${propertyId}?tab=pricing`, { ok: "Season removed." });
}

// ------------------------------------------------------------------ photos

export async function uploadPhotos(propertyId: number, formData: FormData) {
  await requireAdmin();
  const back = `/admin/properties/${propertyId}?tab=photos`;
  const list = files(formData, "photos");
  if (!list.length) go(back, { error: "Choose one or more images to upload." });
  const db = getDb();
  const prop = db.prepare("SELECT name FROM properties WHERE id = ?").get(propertyId) as { name: string } | undefined;
  if (!prop) go("/admin/properties", { error: "Property not found." });
  let order = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM property_images WHERE property_id = ?").get(propertyId) as { n: number }).n;
  let done = 0;
  const failed: string[] = [];
  for (const f of list) {
    try {
      const m = await storeImage(Buffer.from(await f.arrayBuffer()), f.name);
      db.prepare("INSERT INTO property_images (property_id, media_key, alt, sort_order, width, height) VALUES (?, ?, ?, ?, ?, ?)").run(propertyId, m.key, `Photo of ${prop!.name}`, order++, m.width, m.height);
      done++;
    } catch (e) {
      failed.push(`${f.name} (${e instanceof Error ? e.message : "could not be processed"})`);
    }
  }
  refreshPublic();
  go(back, failed.length ? { error: `Uploaded ${done}. Couldn't upload: ${failed.join(", ")}` } : { ok: `Uploaded ${done} photo${done === 1 ? "" : "s"}. Add a short description of each for accessibility.` });
}

export async function updatePhoto(propertyId: number, imageId: number, formData: FormData) {
  await requireAdmin();
  const action = str(formData, "_action");
  const db = getDb();
  const back = `/admin/properties/${propertyId}?tab=photos`;
  if (action === "delete") {
    const img = db.prepare("SELECT media_key FROM property_images WHERE id = ? AND property_id = ?").get(imageId, propertyId) as { media_key: string } | undefined;
    db.prepare("DELETE FROM property_images WHERE id = ? AND property_id = ?").run(imageId, propertyId);
    if (img) deleteMediaFiles(img.media_key);
    refreshPublic();
    go(back, { ok: "Photo removed." });
  }
  if (action === "up" || action === "down" || action === "cover") {
    const rows = db.prepare("SELECT id FROM property_images WHERE property_id = ? ORDER BY sort_order, id").all(propertyId) as { id: number }[];
    const i = rows.findIndex((r) => r.id === imageId);
    if (i >= 0) {
      if (action === "cover") rows.unshift(...rows.splice(i, 1));
      else {
        const j = action === "up" ? i - 1 : i + 1;
        if (j >= 0 && j < rows.length) [rows[i], rows[j]] = [rows[j], rows[i]];
      }
      const upd = db.prepare("UPDATE property_images SET sort_order = ? WHERE id = ?");
      db.transaction(() => rows.forEach((r, k) => upd.run(k, r.id)))();
    }
    refreshPublic();
    go(back);
  }
  db.prepare("UPDATE property_images SET alt = ? WHERE id = ? AND property_id = ?").run(str(formData, "alt", 200), imageId, propertyId);
  refreshPublic();
  go(back, { ok: "Photo description saved." });
}

// ------------------------------------------------------------------ calendar: blocks

export async function addBlock(formData: FormData) {
  await requireAdmin();
  const pid = int(formData, "property_id");
  const start = str(formData, "start_date");
  const lastNight = str(formData, "end_date");
  const back = str(formData, "_back") || "/admin/calendar";
  if (!isIsoDate(start) || !isIsoDate(lastNight) || lastNight < start) go(back, { error: "Choose a valid first and last night to block." });
  try {
    createBlock(pid, start, addDays(lastNight, 1), str(formData, "reason", 200));
  } catch (e) {
    go(back, { error: e instanceof BookingError ? e.message : "Could not block those dates." });
  }
  refreshPublic();
  go(back, { ok: "Dates blocked." });
}

export async function removeBlock(blockId: number, back: string) {
  await requireAdmin();
  deleteBlock(blockId);
  refreshPublic();
  go(back, { ok: "Blocked dates released." });
}

// ------------------------------------------------------------------ bookings

const ManualBooking = z.object({
  property_id: z.number().int().positive("Choose a property"),
  check_in: z.string().refine(isIsoDate, "Check-in date is required"),
  check_out: z.string().refine(isIsoDate, "Check-out date is required"),
  name: z.string().min(2, "Guest name is required").max(120),
  email: z.string().email("A valid guest email is required").max(200),
  phone: z.string().max(40),
  adults: z.number().int().min(1).max(50),
  children: z.number().int().min(0).max(50),
  source: z.string().max(40),
  payment_status: z.enum(["unpaid", "paid_offline"]),
  notes: z.string().max(4000),
});

export async function addManualBooking(formData: FormData) {
  await requireAdmin();
  const parsed = ManualBooking.safeParse({
    property_id: int(formData, "property_id"),
    check_in: str(formData, "check_in"),
    check_out: str(formData, "check_out"),
    name: str(formData, "name"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    adults: int(formData, "adults", 1),
    children: int(formData, "children", 0),
    source: str(formData, "source") || "phone",
    payment_status: str(formData, "payment_status") === "paid_offline" ? "paid_offline" : "unpaid",
    notes: str(formData, "notes"),
  });
  const qs = new URLSearchParams(Object.fromEntries([...formData.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")).map(([k, v]) => [k, String(v)])));
  const back = `/admin/bookings/new?${qs}`;
  if (!parsed.success) go(back, { error: parsed.error.issues.map((i) => i.message).join(". ") });
  const d = parsed.data;
  if (d.check_out <= d.check_in) go(back, { error: "Check-out must be after check-in." });
  const override = str(formData, "total_override") ? parseMoney(str(formData, "total_override")) : null;
  let ref = "";
  try {
    const b = createManualBooking({
      propertyId: d.property_id,
      checkIn: d.check_in,
      checkOut: d.check_out,
      guest: { name: d.name, email: d.email, phone: d.phone, adults: d.adults, children: d.children, message: "" },
      source: d.source,
      paymentStatus: d.payment_status,
      totalOverride: override,
      notes: d.notes,
    });
    ref = b.reference;
    if (formData.get("send_confirmation")) await sendBookingConfirmation(b, rotateAccessToken(b.id));
  } catch (e) {
    go(back, { error: e instanceof BookingError ? e.message : "Could not create the booking." });
  }
  refreshPublic();
  go(`/admin/bookings/${ref}`, { ok: "Booking added and dates reserved." });
}

export async function bookingAction(ref: string, formData: FormData) {
  const admin = await requireAdmin();
  const b = getBookingByRef(ref);
  if (!b) go("/admin/bookings", { error: "Booking not found." });
  const back = `/admin/bookings/${b!.reference}`;
  const action = str(formData, "_action");
  const actor = `admin:${admin.email}`;
  const db = getDb();

  switch (action) {
    case "notes": {
      db.prepare("UPDATE bookings SET admin_notes = ?, updated_at = ? WHERE id = ?").run(str(formData, "admin_notes"), nowIso(), b!.id);
      go(back, { ok: "Notes saved." });
    }
    case "mark_paid": {
      db.prepare("UPDATE bookings SET payment_status = 'paid_offline', amount_paid = total, updated_at = ? WHERE id = ?").run(nowIso(), b!.id);
      db.prepare("INSERT INTO payments (booking_id, kind, amount, provider, note) VALUES (?, 'charge', ?, 'manual', 'Marked as paid by owner')").run(b!.id, b!.total);
      logEvent(b!.id, "Marked as paid (offline payment).", actor);
      go(back, { ok: "Marked as paid." });
    }
    case "confirm_transfer": {
      if (b!.status !== "pending" && b!.status !== "expired") go(back, { error: "This booking isn't awaiting a transfer." });
      const { booking, newlyConfirmed } = confirmPaidBooking(b!.id, { provider: "bank_transfer", providerRef: str(formData, "transfer_ref", 80), amount: b!.total });
      logEvent(b!.id, "Bank transfer marked as received.", actor);
      if (newlyConfirmed) await sendBookingConfirmation(getBookingById(booking.id)!, rotateAccessToken(booking.id));
      refreshPublic();
      go(back, newlyConfirmed ? { ok: "Transfer recorded. The booking is confirmed and the guest has been emailed." } : { error: booking.needs_attention || "Transfer recorded." });
    }
    case "extend_hold": {
      try {
        extendHold(b!.id, Math.min(168, Math.max(1, int(formData, "hours") || 24)), actor);
      } catch (e) {
        go(back, { error: e instanceof BookingError ? e.message : "Could not extend the hold." });
      }
      go(back, { ok: "Hold extended." });
    }
    case "resend": {
      if (b!.status !== "confirmed") go(back, { error: "Only confirmed bookings have a confirmation to resend." });
      await sendBookingConfirmation(b!, rotateAccessToken(b!.id));
      logEvent(b!.id, "Confirmation email re-sent. The guest's previous private link no longer works.", actor);
      go(back, { ok: "Confirmation re-sent to the guest." });
    }
    case "decline_cancel": {
      db.prepare("UPDATE bookings SET cancellation_requested_at = NULL, updated_at = ? WHERE id = ?").run(nowIso(), b!.id);
      logEvent(b!.id, "Cancellation request closed without cancelling. Let the guest know why.", actor);
      go(back, { ok: "Cancellation request closed. The booking remains active; remember to contact the guest." });
    }
    case "clear_attention": {
      db.prepare("UPDATE bookings SET needs_attention = '', updated_at = ? WHERE id = ?").run(nowIso(), b!.id);
      go(back, { ok: "Marked as resolved." });
    }
    case "refund":
    case "cancel": {
      const refundable = b!.amount_paid - b!.amount_refunded;
      const amount = parseMoney(str(formData, "refund_amount") || "0") ?? 0;
      if (amount < 0 || amount > refundable) go(back, { error: `Refund must be between 0 and ${(refundable / 100).toFixed(2)}.` });
      if (action === "refund" && amount === 0) go(back, { error: "Enter an amount to refund." });
      let refunded = 0;
      if (amount > 0) {
        try {
          const r = await refundPayment(b!, amount);
          recordRefund(b!.id, amount, r.provider, r.ref, r.note, actor);
          refunded = amount;
        } catch (e) {
          go(back, { error: `Refund failed at the payment provider: ${e instanceof Error ? e.message : "unknown error"}. Nothing was changed.` });
        }
      }
      if (action === "cancel") {
        if (b!.status === "cancelled") go(back, { error: "This booking is already cancelled." });
        cancelBooking(b!.id, actor, str(formData, "reason", 300));
        if (formData.get("notify")) await sendCancellationEmails(getBookingById(b!.id)!, refunded);
        refreshPublic();
        go(back, { ok: `Booking cancelled and dates released${refunded ? `, with a refund of ${(refunded / 100).toFixed(2)}` : ""}.` });
      }
      if (formData.get("notify")) await sendRefundEmail(getBookingById(b!.id)!, refunded);
      go(back, { ok: "Refund issued." });
    }
  }
  go(back);
}

// ------------------------------------------------------------------ enquiries

export async function setEnquiryStatus(id: number, status: "new" | "replied" | "closed") {
  await requireAdmin();
  getDb().prepare("UPDATE enquiries SET status = ? WHERE id = ?").run(status, id);
  go("/admin/enquiries");
}

// ------------------------------------------------------------------ content

async function maybeImage(fd: FormData, key: string, current: string): Promise<string> {
  const f = files(fd, key)[0];
  if (!f) return current;
  return (await storeImage(Buffer.from(await f.arrayBuffer()), f.name)).key;
}

export async function saveHome(formData: FormData) {
  await requireAdmin();
  const cur = getSetting("home");
  try {
    const next: HomeContent = {
      heroEyebrow: str(formData, "heroEyebrow", 80),
      heroHeadline: str(formData, "heroHeadline", 160) || cur.heroHeadline,
      heroIntro: str(formData, "heroIntro", 500),
      heroImage: await maybeImage(formData, "heroImageFile", cur.heroImage),
      introTitle: str(formData, "introTitle", 160),
      introBody: str(formData, "introBody", 2000),
      introImage: await maybeImage(formData, "introImageFile", cur.introImage),
      benefitsTitle: str(formData, "benefitsTitle", 120),
      benefits: [0, 1, 2, 3].map((i) => ({ title: str(formData, `benefit${i}Title`, 80), body: str(formData, `benefit${i}Body`, 300) })).filter((b) => b.title),
      experiencesTitle: str(formData, "experiencesTitle", 120),
      experiencesIntro: str(formData, "experiencesIntro", 500),
      experiences: [],
      ctaTitle: str(formData, "ctaTitle", 120),
      ctaBody: str(formData, "ctaBody", 300),
    };
    for (const i of [0, 1, 2]) {
      const title = str(formData, `exp${i}Title`, 80);
      if (!title) continue;
      next.experiences.push({ title, body: str(formData, `exp${i}Body`, 300), image: await maybeImage(formData, `exp${i}ImageFile`, cur.experiences[i]?.image ?? "") });
    }
    setSetting("home", next);
  } catch (e) {
    go("/admin/content", { error: e instanceof Error ? e.message : "Could not save." });
  }
  refreshPublic();
  go("/admin/content", { ok: "Homepage saved." });
}

export async function saveFaq(id: number | null, formData: FormData) {
  await requireAdmin();
  const q = str(formData, "question", 300);
  const a = str(formData, "answer", 3000);
  const back = "/admin/content/faqs";
  if (str(formData, "_action") === "delete" && id) {
    getDb().prepare("DELETE FROM faqs WHERE id = ?").run(id);
    refreshPublic();
    go(back, { ok: "Question deleted." });
  }
  if (!q || !a) go(back, { error: "Both a question and an answer are required." });
  const category = str(formData, "category", 60) || "General";
  const published = formData.get("published") ? 1 : 0;
  const order = int(formData, "sort_order", 0);
  if (id) getDb().prepare("UPDATE faqs SET question=?, answer=?, category=?, published=?, sort_order=? WHERE id=?").run(q, a, category, published, order, id);
  else getDb().prepare("INSERT INTO faqs (question, answer, category, published, sort_order) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM faqs))").run(q, a, category, published);
  refreshPublic();
  go(back, { ok: "Question saved." });
}

export async function savePage(slug: string, formData: FormData) {
  await requireAdmin();
  const title = str(formData, "title", 160);
  if (!title) go(`/admin/content/pages/${slug}`, { error: "Title is required." });
  getDb()
    .prepare("UPDATE pages SET title=?, body=?, meta_title=?, meta_description=?, is_draft_content=?, updated_at=? WHERE slug=?")
    .run(title, str(formData, "body", 50000), str(formData, "meta_title", 120), str(formData, "meta_description", 300), formData.get("is_draft_content") ? 1 : 0, nowIso(), slug);
  refreshPublic();
  go(`/admin/content/pages/${slug}`, { ok: "Page saved." });
}

// ------------------------------------------------------------------ settings

export async function saveSettings(section: "site" | "regional" | "tax" | "booking" | "payments", formData: FormData) {
  await requireAdmin();
  const back = `/admin/settings?tab=${section}`;
  if (section === "site") {
    const cur = getSetting("site");
    const next = { ...cur };
    for (const k of Object.keys(cur) as (keyof typeof cur)[]) next[k] = str(formData, k, 500);
    if (!next.brandName) go(back, { error: "Brand name is required." });
    if (!z.string().email().safeParse(next.ownerNotificationEmail).success) go(back, { error: "Owner notification email must be a valid email address." });
    setSetting("site", next);
  } else if (section === "regional") {
    const currency = str(formData, "currency").toUpperCase();
    const locale = str(formData, "locale");
    const timeZone = str(formData, "timeZone");
    try {
      new Intl.NumberFormat(locale, { style: "currency", currency });
      new Intl.DateTimeFormat(locale, { timeZone });
    } catch {
      go(back, { error: "Currency, locale or time zone not recognised. Use codes like GBP, en-GB and Europe/London." });
    }
    if (!/^[A-Z]{3}$/.test(currency)) go(back, { error: "Currency must be a 3-letter code such as GBP or EUR." });
    setSetting("regional", { currency, locale, timeZone });
  } else if (section === "tax") {
    const mode = str(formData, "mode") as TaxSettings["mode"];
    const rate = Number(formData.get("ratePercent"));
    if (!["included", "added", "none"].includes(mode) || !(rate >= 0 && rate <= 50)) go(back, { error: "Tax rate must be between 0 and 50%." });
    setSetting("tax", { name: str(formData, "name", 40) || "Tax", ratePercent: rate, mode });
  } else if (section === "booking") {
    const n = (k: string) => Math.max(0, int(formData, k));
    const next = {
      holdMinutes: Math.min(120, Math.max(10, n("holdMinutes"))),
      maxAdvanceMonths: Math.min(36, Math.max(1, n("maxAdvanceMonths"))),
      fullRefundDays: n("fullRefundDays"),
      partialRefundDays: n("partialRefundDays"),
      partialRefundPercent: Math.min(100, n("partialRefundPercent")),
      cancellationSummary: str(formData, "cancellationSummary", 600),
    };
    if (next.partialRefundDays > next.fullRefundDays) go(back, { error: "The partial refund window must be shorter than the full refund window." });
    setSetting("booking", next);
  } else if (section === "payments") {
    const next = {
      bankTransferEnabled: !!formData.get("bankTransferEnabled"),
      bankName: str(formData, "bankName", 80),
      accountName: str(formData, "accountName", 80),
      sortCode: str(formData, "sortCode", 20),
      accountNumber: str(formData, "accountNumber", 20).replace(/\s+/g, ""),
      transferHoldHours: Math.min(168, Math.max(1, int(formData, "transferHoldHours") || 24)),
      transferNote: str(formData, "transferNote", 300),
    };
    if (next.bankTransferEnabled) {
      if (!next.accountName) go(back, { error: "Add the account name before switching on bank transfer." });
      if (!/^\d{2}-?\d{2}-?\d{2}$/.test(next.sortCode)) go(back, { error: "Sort code should be 6 digits, for example 12-34-56." });
      if (!/^\d{8}$/.test(next.accountNumber)) go(back, { error: "Account number should be 8 digits." });
      const d = next.sortCode.replace(/-/g, "");
      next.sortCode = `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
    }
    setSetting("payments", next);
  }
  refreshPublic();
  go(back, { ok: "Settings saved." });
}

export async function changePassword(formData: FormData) {
  const admin = await requireAdmin();
  const back = "/admin/settings?tab=account";
  const row = getDb().prepare("SELECT password_hash FROM admin_users WHERE id = ?").get(admin.id) as { password_hash: string };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const email = str(formData, "email").toLowerCase();
  if (!verifyPassword(current, row.password_hash)) go(back, { error: "Your current password is incorrect." });
  if (next.length < 12) go(back, { error: "Choose a new password of at least 12 characters." });
  if (next !== confirm) go(back, { error: "The new passwords don't match." });
  if (!z.string().email().safeParse(email).success) go(back, { error: "Enter a valid sign-in email." });
  getDb().prepare("UPDATE admin_users SET password_hash = ?, email = ?, must_change_password = 0 WHERE id = ?").run(hashPassword(next), email, admin.id);
  go(back, { ok: "Sign-in details updated." });
}

// ------------------------------------------------------------------ Smoobu

export async function saveSmoobuLinks(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  const props = db.prepare("SELECT id FROM properties").all() as { id: number }[];
  const seen = new Set<number>();
  for (const { id } of props) {
    const raw = str(formData, `apt_${id}`, 20);
    const apt = raw ? Number(raw) : null;
    if (apt !== null && (!Number.isInteger(apt) || apt <= 0)) go("/admin/smoobu", { error: "Please choose a Smoobu listing from the list." });
    if (apt !== null && seen.has(apt)) go("/admin/smoobu", { error: "Each Smoobu listing can only be linked to one apartment." });
    if (apt !== null) seen.add(apt);
  }
  db.transaction(() => {
    for (const { id } of props) {
      const raw = str(formData, `apt_${id}`, 20);
      const apt = raw ? Number(raw) : null;
      const prev = db.prepare("SELECT smoobu_apartment_id FROM properties WHERE id = ?").get(id) as { smoobu_apartment_id: number | null };
      if (prev.smoobu_apartment_id !== apt) {
        db.prepare("UPDATE properties SET smoobu_apartment_id = ?, updated_at = ? WHERE id = ?").run(apt, nowIso(), id);
        db.prepare("DELETE FROM smoobu_nights WHERE property_id = ?").run(id);
      }
    }
  })();
  const { syncAll } = await import("@/lib/smoobu");
  const st = await syncAll();
  refreshPublic();
  go("/admin/smoobu", st.error ? { error: `Links saved, but the sync failed: ${st.error}` } : { ok: "Links saved and prices synced from Smoobu." });
}

export async function syncSmoobuNow() {
  await requireAdmin();
  const { syncAll } = await import("@/lib/smoobu");
  const st = await syncAll();
  refreshPublic();
  go("/admin/smoobu", st.error ? { error: st.error } : { ok: `Synced ${st.properties} apartments from Smoobu.` });
}

export async function setPrivateMode(on: boolean) {
  await requireAdmin();
  const { setSitePrivate } = await import("@/lib/private-mode");
  setSitePrivate(on);
  refreshPublic();
  go("/admin/settings?tab=site", { ok: on ? "Website is now private. The public sees a Coming soon page." : "Website is now open to the public." });
}
