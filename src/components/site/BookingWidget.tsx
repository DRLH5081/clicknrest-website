"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PriceBreakdown } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { PriceSummary } from "./PriceSummary";
import { Icon } from "../Icon";

// ------------------------------------------------------------------ helpers

function addDays(s: string, n: number) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function monthStart(s: string) {
  return s.slice(0, 8) + "01";
}
function addMonths(s: string, n: number) {
  const d = new Date(monthStart(s) + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}
function fmt(s: string, locale: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(new Date(s + "T00:00:00Z"));
}

type Availability = {
  today: string;
  maxDate: string;
  unavailable: string[];
  minStay: Record<string, number>;
  defaultMinNights: number;
};

type Quote = { ok: true; breakdown: PriceBreakdown } | { ok: false; message: string };

type Ctx = {
  slug: string;
  locale: string;
  currency: string;
  maxGuests: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  setGuests: (n: number) => void;
  pick: (date: string) => void;
  setRange: (a: string, b: string) => void;
  clear: () => void;
  avail: Availability | null;
  taken: Set<string>;
  loadMonths: (start: string) => void;
  quote: Quote | null;
  quoting: boolean;
  hint: string;
};

const BookingCtx = createContext<Ctx | null>(null);
function useBooking() {
  const c = useContext(BookingCtx);
  if (!c) throw new Error("BookingProvider missing");
  return c;
}

// ------------------------------------------------------------------ provider

export function BookingProvider(props: {
  slug: string;
  locale: string;
  currency: string;
  maxGuests: number;
  initial: { checkIn?: string; checkOut?: string; guests?: number };
  children: React.ReactNode;
}) {
  const [checkIn, setCheckIn] = useState(props.initial.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(props.initial.checkOut ?? "");
  const [guests, setGuests] = useState(Math.min(props.initial.guests || 2, props.maxGuests));
  const [avail, setAvail] = useState<Availability | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [hint, setHint] = useState("");
  const loaded = useRef(new Set<string>());

  const loadMonths = useCallback(
    (start: string) => {
      const key = monthStart(start);
      if (loaded.current.has(key)) return;
      loaded.current.add(key);
      fetch(`/api/availability?slug=${encodeURIComponent(props.slug)}&from=${key}&to=${addMonths(key, 3)}`)
        .then((r) => r.json())
        .then((d) => {
          setAvail((prev) => ({
            today: d.today,
            maxDate: d.maxDate,
            defaultMinNights: d.defaultMinNights,
            unavailable: [],
            minStay: { ...(prev?.minStay ?? {}), ...d.minStay },
          }));
          setTaken((prev) => {
            const next = new Set(prev);
            for (const n of d.unavailable as string[]) next.add(n);
            return next;
          });
        })
        .catch(() => loaded.current.delete(key));
    },
    [props.slug],
  );

  // Fetch a live server-side quote whenever the selection changes.
  useEffect(() => {
    if (!checkIn || !checkOut) {
      setQuote(null);
      return;
    }
    const ctrl = new AbortController();
    setQuoting(true);
    const t = setTimeout(() => {
      fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: props.slug, checkIn, checkOut, guests }),
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((q: Quote) => setQuote(q))
        .catch((e) => {
          if (e.name !== "AbortError") setQuote({ ok: false, message: "We couldn't check the price just now. Please try again." });
        })
        .finally(() => setQuoting(false));
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [checkIn, checkOut, guests, props.slug]);

  const minFor = useCallback((d: string) => avail?.minStay[d] ?? avail?.defaultMinNights ?? 1, [avail]);

  const pick = useCallback(
    (date: string) => {
      if (!checkIn || checkOut || date <= checkIn) {
        if (taken.has(date)) return;
        setCheckIn(date);
        setCheckOut("");
        setHint(`Minimum stay from this date is ${minFor(date)} ${minFor(date) === 1 ? "night" : "nights"}. Now choose your check-out date.`);
        return;
      }
      // choosing check-out: every night in between must be free
      for (let d = checkIn; d < date; d = addDays(d, 1)) {
        if (taken.has(d)) {
          if (!taken.has(date)) {
            setCheckIn(date);
            setCheckOut("");
            setHint("Those dates include unavailable nights, so we've started a new selection.");
          }
          return;
        }
      }
      setCheckOut(date);
      setHint("");
    },
    [checkIn, checkOut, taken, minFor],
  );

  const value: Ctx = {
    slug: props.slug,
    locale: props.locale,
    currency: props.currency,
    maxGuests: props.maxGuests,
    checkIn,
    checkOut,
    guests,
    setGuests,
    pick,
    setRange: (a, b) => {
      setCheckIn(a);
      setCheckOut(b);
    },
    clear: () => {
      setCheckIn("");
      setCheckOut("");
      setHint("");
    },
    avail,
    taken,
    loadMonths,
    quote,
    quoting,
    hint,
  };
  return <BookingCtx.Provider value={value}>{props.children}</BookingCtx.Provider>;
}

// ------------------------------------------------------------------ calendar

function Month({ start, focus, setFocus }: { start: string; focus: string; setFocus: (d: string) => void }) {
  const { locale, checkIn, checkOut, taken, avail, pick } = useBooking();
  const first = new Date(start + "T00:00:00Z");
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const today = avail?.today ?? "";
  const maxDate = avail?.maxDate ?? "9999-12-31";
  const weekdays = Array.from({ length: 7 }, (_, i) => fmt(addDays("2024-01-01", i), locale, { weekday: "short" }));

  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(start, i))];

  return (
    <div>
      <h3 className="mb-3 text-center text-sm font-semibold">{fmt(start, locale, { month: "long", year: "numeric" })}</h3>
      <div role="grid" aria-label={fmt(start, locale, { month: "long", year: "numeric" })} className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {weekdays.map((w) => (
          <div key={w} role="columnheader" className="pb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            {w.slice(0, 2)}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} role="gridcell" />;
          const past = d < today || d > maxDate;
          const isTaken = taken.has(d);
          // A taken night can still be a check-out day if the previous night is in the selection.
          const canCheckout = !!checkIn && !checkOut && d > checkIn && !past;
          const disabled = past || (isTaken && !canCheckout);
          const selStart = d === checkIn;
          const selEnd = d === checkOut;
          const inRange = checkIn && checkOut && d > checkIn && d < checkOut;
          const label = `${fmt(d, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${
            past ? ", not bookable" : isTaken ? (canCheckout ? ", available for check-out only" : ", unavailable") : ", available"
          }${selStart ? ", check-in" : ""}${selEnd ? ", check-out" : ""}`;
          return (
            <div key={d} role="gridcell" className={`relative ${inRange ? "bg-sand-200" : ""} ${selStart && checkOut ? "rounded-l-full bg-sand-200" : ""} ${selEnd ? "rounded-r-full bg-sand-200" : ""}`}>
              <button
                type="button"
                data-date={d}
                tabIndex={d === focus ? 0 : -1}
                aria-disabled={disabled}
                aria-pressed={selStart || selEnd || !!inRange}
                aria-label={label}
                onFocus={() => setFocus(d)}
                onClick={() => !disabled && pick(d)}
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full tabular-nums transition ${
                  selStart || selEnd
                    ? "bg-ink font-semibold text-white"
                    : disabled
                      ? `cursor-not-allowed text-ink-muted/50 ${isTaken && !past ? "line-through decoration-ink-muted/60" : ""}`
                      : "hover:ring-1 hover:ring-ink"
                }`}
              >
                {Number(d.slice(8))}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AvailabilityCalendar() {
  const { avail, loadMonths, checkIn, checkOut, clear, hint, locale } = useBooking();
  const [month, setMonth] = useState<string>(() => monthStart(checkIn || new Date().toISOString().slice(0, 10)));
  const [focus, setFocus] = useState<string>(checkIn || new Date().toISOString().slice(0, 10));
  const wrap = useRef<HTMLDivElement>(null);
  // Render dates only in the browser: server and browser can format dates
  // slightly differently, which would cause a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    loadMonths(month);
    loadMonths(addMonths(month, 2));
  }, [month, loadMonths]);

  useEffect(() => {
    if (avail && focus < avail.today) setFocus(avail.today);
  }, [avail, focus]);

  const minMonth = avail ? monthStart(avail.today) : month;
  const maxMonth = avail ? monthStart(avail.maxDate) : "9999-12-01";

  function onKey(e: React.KeyboardEvent) {
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in delta)) return;
    e.preventDefault();
    const next = addDays(focus, delta[e.key]);
    if (avail && next < avail.today) return;
    setFocus(next);
    if (next < month) setMonth(monthStart(next));
    if (next >= addMonths(month, 2)) setMonth(addMonths(monthStart(next), -1));
    requestAnimationFrame(() => wrap.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus());
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" className="btn-outline h-10 w-10 p-0" onClick={() => setMonth(addMonths(month, -1))} disabled={month <= minMonth} aria-label="Previous month">
          <Icon name="chevronLeft" className="h-4 w-4" />
        </button>
        <p className="text-sm text-ink-soft" aria-live="polite">
          {!mounted ? "" : checkIn && checkOut
            ? `${fmt(checkIn, locale, { day: "numeric", month: "short" })} – ${fmt(checkOut, locale, { day: "numeric", month: "short", year: "numeric" })}`
            : checkIn
              ? "Select check-out date"
              : "Select check-in date"}
        </p>
        <button type="button" className="btn-outline h-10 w-10 p-0" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= maxMonth} aria-label="Next month">
          <Icon name="chevronRight" className="h-4 w-4" />
        </button>
      </div>
      <div ref={wrap} onKeyDown={onKey} className={`grid gap-8 sm:grid-cols-2 ${avail ? "" : "animate-pulse opacity-60"}`} aria-busy={!avail}>
        {mounted ? (
          <>
            <Month start={month} focus={focus} setFocus={setFocus} />
            <div className="hidden sm:block">
              <Month start={addMonths(month, 1)} focus={focus} setFocus={setFocus} />
            </div>
          </>
        ) : (
          <div className="h-80 rounded-2xl bg-sand-100 sm:col-span-2" />
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-ink" aria-hidden /> Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-ink-muted/60 line-through" aria-hidden>
              12
            </span>{" "}
            Unavailable
          </span>
        </span>
        {(checkIn || checkOut) && (
          <button type="button" onClick={clear} className="font-semibold text-ink underline underline-offset-2">
            Clear dates
          </button>
        )}
      </div>
      {hint && (
        <p className="mt-3 text-sm text-ink-soft" role="status">
          {hint}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ booking panel

export function BookingPanel({ fromPrice, minNights }: { fromPrice: number; minNights: number }) {
  const { slug, checkIn, checkOut, guests, setGuests, maxGuests, quote, quoting, setRange, locale, currency, avail } = useBooking();
  const ready = quote?.ok && !quoting;
  const href = useMemo(() => `/book/${slug}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`, [slug, checkIn, checkOut, guests]);
  const today = avail?.today ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="card p-6" id="book">
      <p className="text-sm text-ink-muted">
        {quote?.ok ? (
          <>
            <span className="font-display text-2xl text-ink">{formatMoney(quote.breakdown.total, currency, locale)}</span> total for {quote.breakdown.nightCount}{" "}
            {quote.breakdown.nightCount === 1 ? "night" : "nights"}
          </>
        ) : (
          <>
            from <span className="font-display text-2xl text-ink">{formatMoney(fromPrice, currency, locale, { whole: true })}</span> / night
          </>
        )}
      </p>
      <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-sand-300">
        <label className="border-b border-r border-sand-300 px-3.5 py-2.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider">Check-in</span>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => setRange(e.target.value, checkOut && checkOut > e.target.value ? checkOut : addDays(e.target.value, minNights))}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </label>
        <label className="border-b border-sand-300 px-3.5 py-2.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider">Check-out</span>
          <input
            type="date"
            min={checkIn ? addDays(checkIn, 1) : today}
            value={checkOut}
            onChange={(e) => setRange(checkIn, e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </label>
        <label className="col-span-2 px-3.5 py-2.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider">Guests</span>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full bg-transparent text-sm focus:outline-none">
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 min-h-[3rem]" aria-live="polite">
        {!checkIn || !checkOut ? (
          <p className="text-sm text-ink-soft">Choose dates to see the full price. Minimum stay from {minNights} nights.</p>
        ) : quoting ? (
          <div className="space-y-2" aria-label="Checking price">
            <div className="h-4 w-3/4 animate-pulse rounded bg-sand-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-sand-200" />
            <div className="h-5 w-full animate-pulse rounded bg-sand-200" />
          </div>
        ) : quote && !quote.ok ? (
          <p className="flex items-start gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            {quote.message}
          </p>
        ) : quote?.ok ? (
          <PriceSummary b={quote.breakdown} locale={locale} />
        ) : null}
      </div>

      {ready ? (
        <Link href={href} className="btn-primary mt-5 w-full py-3 text-base">
          Reserve
        </Link>
      ) : (
        <button type="button" disabled className="btn-primary mt-5 w-full py-3 text-base">
          {quoting ? "Checking…" : "Reserve"}
        </button>
      )}
      <p className="mt-3 text-center text-xs text-ink-muted">You won&apos;t be charged yet. You&apos;ll review everything before paying.</p>
    </div>
  );
}

export function MobileBookingBar({ fromPrice }: { fromPrice: number }) {
  const { quote, currency, locale } = useBooking();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm">
          {quote?.ok ? (
            <>
              <span className="font-semibold">{formatMoney(quote.breakdown.total, currency, locale)}</span> <span className="text-ink-muted">total</span>
            </>
          ) : (
            <>
              <span className="text-ink-muted">from </span>
              <span className="font-semibold">{formatMoney(fromPrice, currency, locale, { whole: true })}</span>
              <span className="text-ink-muted"> / night</span>
            </>
          )}
        </p>
        <a href="#book" className="btn-primary">
          {quote?.ok ? "Review & reserve" : "Check availability"}
        </a>
      </div>
    </div>
  );
}
