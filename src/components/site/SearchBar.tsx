"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "../Icon";

type Props = {
  regions: string[];
  today: string;
  initial?: { location?: string; checkIn?: string; checkOut?: string; guests?: string };
  variant?: "hero" | "inline";
};

function addDays(s: string, n: number) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function SearchBar({ regions, today, initial = {}, variant = "hero" }: Props) {
  const router = useRouter();
  const [location, setLocation] = useState(initial.location ?? "");
  const [checkIn, setCheckIn] = useState(initial.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial.checkOut ?? "");
  const [guests, setGuests] = useState(initial.guests ?? "2");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((checkIn && !checkOut) || (!checkIn && checkOut)) return setError("Please choose both check-in and check-out dates.");
    if (checkIn && checkOut && checkOut <= checkIn) return setError("Check-out must be after check-in.");
    setError("");
    setPending(true);
    const q = new URLSearchParams();
    if (location) q.set("location", location);
    if (checkIn) q.set("checkIn", checkIn);
    if (checkOut) q.set("checkOut", checkOut);
    if (guests) q.set("guests", guests);
    router.push(`/stays?${q.toString()}`);
  }

  const field = "flex flex-col gap-1 px-5 py-3 text-left";
  const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-ink";
  const ctrl = "w-full bg-transparent text-sm text-ink focus:outline-none";

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Search stays"
      className={`${variant === "hero" ? "shadow-lift" : "shadow-soft"} w-full rounded-3xl bg-white p-2 ring-1 ring-sand-200 md:rounded-full`}
    >
      <div className="grid grid-cols-2 gap-y-1 md:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto] md:items-center md:divide-x md:divide-sand-200">
        <label className={`${field} col-span-2 md:col-span-1`}>
          <span className={labelCls}>Location</span>
          <select className={ctrl} value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">Anywhere</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          <span className={labelCls}>Check-in</span>
          <input
            type="date"
            className={ctrl}
            min={today}
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (e.target.value && (!checkOut || checkOut <= e.target.value)) setCheckOut(addDays(e.target.value, 3));
            }}
          />
        </label>
        <label className={field}>
          <span className={labelCls}>Check-out</span>
          <input type="date" className={ctrl} min={checkIn ? addDays(checkIn, 1) : today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
        <label className={`${field} col-span-2 md:col-span-1`}>
          <span className={labelCls}>Guests</span>
          <select className={ctrl} value={guests} onChange={(e) => setGuests(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2 p-1 md:col-span-1 md:border-l-0 md:pl-2">
          <button type="submit" className="btn-primary h-12 w-full md:w-auto md:px-6" disabled={pending}>
            <Icon name="search" className="h-4 w-4" />
            <span>{pending ? "Searching…" : "Search"}</span>
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="px-5 pb-2 pt-1 text-sm text-danger-600">
          {error}
        </p>
      )}
    </form>
  );
}
