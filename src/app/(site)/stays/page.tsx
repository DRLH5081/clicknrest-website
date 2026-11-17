import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { listPublishedProperties, fromPrice, locations } from "@/lib/properties";
import { formatDate, isIsoDate, todayIn, addDays } from "@/lib/dates";
import { quoteStay, minNightsFor } from "@/lib/pricing";
import { nextAvailableStart, releaseExpiredHolds } from "@/lib/availability";
import { AMENITY_MAP, FILTER_AMENITIES } from "@/lib/amenities";
import { PropertyCard, type CardProperty } from "@/components/site/PropertyCard";
import { Icon } from "@/components/Icon";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "All stays",
  description: "Browse every home in the collection, check live availability and book directly.",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "guests_desc", label: "Guests: most first" },
  { value: "guests_asc", label: "Guests: fewest first" },
];

export default async function StaysPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { currency, locale, timeZone } = getSetting("regional");
  const today = todayIn(timeZone);
  const all = listPublishedProperties();
  releaseExpiredHolds();

  const location = one(sp.location);
  const checkIn = one(sp.checkIn);
  const checkOut = one(sp.checkOut);
  const hasDates = isIsoDate(checkIn) && isIsoDate(checkOut) && checkOut > checkIn && checkIn >= today;
  const datesInvalid = (checkIn || checkOut) && !hasDates;
  const guests = Math.max(0, Number(one(sp.guests)) || 0);
  const bedrooms = Math.max(0, Number(one(sp.bedrooms)) || 0);
  const minPrice = Number(one(sp.minPrice)) || 0;
  const maxPrice = Number(one(sp.maxPrice)) || 0;
  const amenities = many(sp.amenity).filter((a) => AMENITY_MAP.has(a));
  const sort = SORTS.some((s) => s.value === one(sp.sort)) ? one(sp.sort) : "recommended";

  type Row = CardProperty & { _nightly: number; _available: boolean; _order: number };
  let rows: Row[] = all.map((p, i) => {
    const base: Row = {
      ...p,
      image: p.images[0],
      fromPrice: fromPrice(p, today),
      _nightly: fromPrice(p, today),
      _available: true,
      _order: i,
    };
    if (hasDates) {
      const q = quoteStay(p, { checkIn, checkOut, guests: Math.min(Math.max(guests, 1), p.max_guests) });
      if (q.ok) {
        base.stayTotal = q.breakdown.total;
        base.stayNights = q.breakdown.nightCount;
        base._nightly = q.breakdown.averageNightly;
        base.availability = { kind: "available", label: "Available for your dates" };
      } else {
        base._available = false;
        base.availability = {
          kind: "unavailable",
          label: q.error === "min_stay" ? `Minimum stay ${q.minNights} nights` : q.error === "unavailable" ? "Booked for your dates" : "Unavailable for these dates",
        };
      }
    } else {
      const next = nextAvailableStart(p.id, today, minNightsFor(p, today));
      base.availability = next
        ? { kind: "next", label: next <= addDays(today, 1) ? "Available now" : `Next available ${formatDate(next, locale, { day: "numeric", month: "short" })}` }
        : { kind: "unavailable", label: "Fully booked" };
    }
    return base;
  });

  rows = rows.filter(
    (p) =>
      (!location || p.town === location) &&
      (!guests || p.max_guests >= guests) &&
      (!bedrooms || p.bedrooms >= bedrooms) &&
      (!minPrice || p._nightly >= minPrice * 100) &&
      (!maxPrice || p._nightly <= maxPrice * 100) &&
      amenities.every((a) => all.find((x) => x.slug === p.slug)!.amenities.includes(a)),
  );

  rows.sort((a, b) => {
    if (hasDates && a._available !== b._available) return a._available ? -1 : 1;
    switch (sort) {
      case "price_asc":
        return a._nightly - b._nightly;
      case "price_desc":
        return b._nightly - a._nightly;
      case "guests_desc":
        return b.max_guests - a.max_guests;
      case "guests_asc":
        return a.max_guests - b.max_guests;
      default:
        return a._order - b._order;
    }
  });

  const availableCount = rows.filter((r) => r._available).length;
  const activeFilters = [location, guests, bedrooms, minPrice, maxPrice].filter(Boolean).length + amenities.length + (hasDates ? 1 : 0);
  const carry = new URLSearchParams();
  if (hasDates) {
    carry.set("checkIn", checkIn);
    carry.set("checkOut", checkOut);
  }
  if (guests) carry.set("guests", String(guests));
  const query = carry.toString() ? `?${carry}` : "";

  const filterForm = (
    <form method="get" action="/stays" className="space-y-6" aria-label="Filter stays">
      <input type="hidden" name="sort" value={sort} />
      <fieldset>
        <legend className="label">Dates</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-muted">
            Check-in
            <input type="date" name="checkIn" defaultValue={checkIn} min={today} className="input mt-1" />
          </label>
          <label className="text-xs text-ink-muted">
            Check-out
            <input type="date" name="checkOut" defaultValue={checkOut} min={today} className="input mt-1" />
          </label>
        </div>
        {datesInvalid && <p className="mt-2 text-xs text-danger-600">Please choose a check-out date after your check-in date, starting from today.</p>}
      </fieldset>
      <label className="block">
        <span className="label">Location</span>
        <select name="location" defaultValue={location} className="input">
          <option value="">Anywhere</option>
          {locations(all).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Guests</span>
          <select name="guests" defaultValue={guests || ""} className="input">
            <option value="">Any</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Bedrooms</span>
          <select name="bedrooms" defaultValue={bedrooms || ""} className="input">
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="label">Price per night</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-muted">
            Min
            <input type="number" inputMode="numeric" min={0} step={10} name="minPrice" defaultValue={minPrice || ""} placeholder="No min" className="input mt-1" />
          </label>
          <label className="text-xs text-ink-muted">
            Max
            <input type="number" inputMode="numeric" min={0} step={10} name="maxPrice" defaultValue={maxPrice || ""} placeholder="No max" className="input mt-1" />
          </label>
        </div>
        <p className="hint">In {currency}. Uses your stay&apos;s average when dates are chosen.</p>
      </fieldset>
      <fieldset>
        <legend className="label">Amenities</legend>
        <div className="space-y-2">
          {FILTER_AMENITIES.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input type="checkbox" name="amenity" value={key} defaultChecked={amenities.includes(key)} className="h-4 w-4 rounded border-sand-400 accent-gold-600" />
              {AMENITY_MAP.get(key)!.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1">
          Apply filters
        </button>
        <Link href="/stays" className="btn-outline">
          Clear
        </Link>
      </div>
    </form>
  );

  const sortParams = (value: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const vv of many(v)) if (k !== "sort") q.append(k, vv);
    q.set("sort", value);
    return `/stays?${q}`;
  };

  return (
    <div className="container-x pt-10 md:pt-14">
      <header className="max-w-3xl">
        <p className="eyebrow">All stays</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Find your place to stay</h1>
        <p className="mt-3 text-ink-soft">
          {hasDates ? (
            <>
              {availableCount} of {rows.length} {rows.length === 1 ? "home" : "homes"} available for {formatDate(checkIn, locale, { day: "numeric", month: "short" })} to{" "}
              {formatDate(checkOut, locale, { day: "numeric", month: "short", year: "numeric" })}.
            </>
          ) : (
            <>
              {rows.length} {rows.length === 1 ? "home" : "homes"}. Add dates to see live availability and total prices.
            </>
          )}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside>
          <details className="card group p-5 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
              <span>
                Filters {activeFilters > 0 && <span className="badge ml-1 bg-gold-50 text-gold-700">{activeFilters} active</span>}
              </span>
              <Icon name="chevronDown" className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="mt-5">{filterForm}</div>
          </details>
          <div className="card sticky top-28 hidden p-6 lg:block">
            <h2 className="mb-5 font-display text-lg">Filters</h2>
            {filterForm}
          </div>
        </aside>

        <section aria-label="Results">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted" aria-live="polite">
              Showing {rows.length} {rows.length === 1 ? "home" : "homes"}
            </p>
            <nav aria-label="Sort" className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="mr-1 text-ink-muted">Sort:</span>
              {SORTS.map((s) => (
                <Link
                  key={s.value}
                  href={sortParams(s.value)}
                  aria-current={sort === s.value ? "true" : undefined}
                  className={`rounded-full px-3 py-1.5 transition ${sort === s.value ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-sand-200 hover:ring-ink"}`}
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </div>

          {rows.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sand-100 text-ink-soft">
                <Icon name="search" className="h-6 w-6" />
              </span>
              <h2 className="mt-5 font-display text-2xl">No homes match all of those filters</h2>
              <p className="mt-2 max-w-md text-ink-soft">Try fewer amenities, a wider price range or a different location. Or get in touch and we&apos;ll help you find the right fit.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link href={`/stays${query}`} className="btn-primary">
                  Keep dates, clear other filters
                </Link>
                <Link href="/contact" className="btn-outline">
                  Ask us
                </Link>
              </div>
            </div>
          ) : (
            <>
              {hasDates && availableCount === 0 && (
                <div className="mb-8 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700" role="status">
                  <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    None of these homes are free for all of those nights. Try shifting your dates by a day or two, or open a home to see its calendar.{" "}
                    <Link href="/stays" className="font-semibold underline">
                      Browse without dates
                    </Link>
                  </p>
                </div>
              )}
              <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((p, i) => (
                  <PropertyCard key={p.slug} p={p} currency={currency} locale={locale} query={query} priority={i < 3} />
                ))}
              </div>
            </>
          )}
          {minPrice > 0 && maxPrice > 0 && minPrice > maxPrice && (
            <p className="mt-6 text-sm text-danger-600">The minimum price is higher than the maximum ({formatMoney(minPrice * 100, currency, locale, { whole: true })} vs {formatMoney(maxPrice * 100, currency, locale, { whole: true })}).</p>
          )}
        </section>
      </div>
    </div>
  );
}
