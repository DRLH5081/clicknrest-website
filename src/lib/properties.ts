import { getDb } from "./db";
import { smoobuEnabled } from "./smoobu";

export type PropertyStatus = "draft" | "published" | "archived";

export type PropertyRow = {
  id: number;
  slug: string;
  name: string;
  status: PropertyStatus;
  featured: number;
  sort_order: number;
  property_type: string;
  summary: string;
  description: string;
  town: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  area_info: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  max_guests: number;
  amenities: string;
  base_rate: number;
  weekend_rate: number | null;
  cleaning_fee: number;
  min_nights: number;
  max_nights: number;
  check_in_time: string;
  check_out_time: string;
  check_in_info: string;
  house_rules: string;
  meta_title: string;
  meta_description: string;
  is_demo: number;
  smoobu_apartment_id: number | null;
  created_at: string;
  updated_at: string;
};

export type PropertyImage = {
  id: number;
  property_id: number;
  media_key: string;
  alt: string;
  sort_order: number;
  width: number;
  height: number;
};

export type Season = {
  id: number;
  property_id: number;
  name: string;
  start_date: string;
  end_date: string;
  nightly_rate: number;
  min_nights: number | null;
};

export type Property = Omit<PropertyRow, "amenities"> & {
  amenities: string[];
  images: PropertyImage[];
  seasons: Season[];
};

function hydrate(row: PropertyRow): Property {
  const db = getDb();
  let amenities: string[] = [];
  try {
    amenities = JSON.parse(row.amenities);
  } catch {}
  const images = db.prepare("SELECT * FROM property_images WHERE property_id = ? ORDER BY sort_order, id").all(row.id) as PropertyImage[];
  const seasons = db.prepare("SELECT * FROM seasons WHERE property_id = ? ORDER BY start_date").all(row.id) as Season[];
  return { ...row, amenities, images, seasons };
}

export function listPublishedProperties(): Property[] {
  const rows = getDb()
    .prepare("SELECT * FROM properties WHERE status = 'published' ORDER BY sort_order, name")
    .all() as PropertyRow[];
  return rows.map(hydrate);
}

export function listAllProperties(includeArchived = true): Property[] {
  const rows = getDb()
    .prepare(`SELECT * FROM properties ${includeArchived ? "" : "WHERE status != 'archived'"} ORDER BY status = 'archived', sort_order, name`)
    .all() as PropertyRow[];
  return rows.map(hydrate);
}

export function getPropertyBySlug(slug: string, opts: { publishedOnly?: boolean } = {}): Property | null {
  const row = getDb()
    .prepare(`SELECT * FROM properties WHERE slug = ? ${opts.publishedOnly ? "AND status = 'published'" : ""}`)
    .get(slug) as PropertyRow | undefined;
  return row ? hydrate(row) : null;
}

export function getPropertyById(id: number): Property | null {
  const row = getDb().prepare("SELECT * FROM properties WHERE id = ?").get(id) as PropertyRow | undefined;
  return row ? hydrate(row) : null;
}

/** Lowest nightly price a guest could pay (base, weekend or any current/future season). */
export function fromPrice(p: Property, today: string): number {
  if (p.smoobu_apartment_id && smoobuEnabled()) {
    // Cheapest bookable Smoobu night in the next 90 days.
    const row = getDb()
      .prepare("SELECT MIN(price) AS m FROM smoobu_nights WHERE property_id = ? AND night >= ? AND night < date(?, '+90 day') AND available = 1 AND price > 0")
      .get(p.id, today, today) as { m: number | null };
    if (row.m) return row.m;
  }
  const rates = [p.base_rate];
  if (p.weekend_rate) rates.push(p.weekend_rate);
  for (const s of p.seasons) if (s.end_date >= today) rates.push(s.nightly_rate);
  return Math.min(...rates);
}

/** Distinct towns, used as the location filter. */
export function locations(props: Property[]): string[] {
  return Array.from(new Set(props.map((p) => p.town).filter(Boolean))).sort();
}

export function houseRulesList(p: Pick<Property, "house_rules">): string[] {
  return p.house_rules
    .split("\n")
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}
