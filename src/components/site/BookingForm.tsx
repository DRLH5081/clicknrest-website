"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../Icon";

type Props = { slug: string; checkIn: string; checkOut: string; guests: number; maxGuests: number; demo: boolean; totalLabel: string; holdMinutes: number; bankTransfer?: boolean };

export function BookingForm({ slug, checkIn, checkOut, guests, maxGuests, demo, totalLabel, holdMinutes, bankTransfer = false }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [adults, setAdults] = useState(Math.max(1, guests));
  const [children, setChildren] = useState(0);
  const overCapacity = adults + children > maxGuests;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (overCapacity) return;
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          checkIn,
          checkOut,
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          adults,
          children,
          message: fd.get("message"),
          acceptTerms: fd.get("acceptTerms") === "on",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Something went wrong.");
        setFieldErrors(data.fieldErrors || {});
        setPending(false);
        document.getElementById("form-error")?.focus();
        return;
      }
      window.location.assign(data.redirect);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  const err = (k: string) =>
    fieldErrors[k] ? (
      <p id={`${k}-error`} className="mt-1 text-xs text-danger-600">
        {fieldErrors[k]}
      </p>
    ) : null;
  const aria = (k: string) => (fieldErrors[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {error && (
        <div id="form-error" tabIndex={-1} role="alert" className="flex items-start gap-3 rounded-2xl bg-danger-50 p-4 text-sm text-danger-700">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{error}</p>
            {error.includes("dates") && (
              <Link href={`/stays/${slug}`} className="mt-1 inline-block underline">
                Choose new dates
              </Link>
            )}
          </div>
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-xl">Your details</legend>
        <p className="-mt-1 text-sm text-ink-muted">No account needed. We&apos;ll use these to send your confirmation and arrival details.</p>
        <div>
          <label htmlFor="name" className="label">
            Full name
          </label>
          <input id="name" name="name" autoComplete="name" required className="input" {...aria("name")} />
          {err("name")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" {...aria("email")} />
            {err("email")}
          </div>
          <div>
            <label htmlFor="phone" className="label">
              Phone
            </label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" required className="input" {...aria("phone")} />
            {err("phone")}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-xl">Who&apos;s coming</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="adults" className="label">
              Adults
            </label>
            <select id="adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))} className="input">
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="children" className="label">
              Children
            </label>
            <select id="children" value={children} onChange={(e) => setChildren(Number(e.target.value))} className="input">
              {Array.from({ length: maxGuests }, (_, i) => i).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        {overCapacity && (
          <p className="text-sm text-danger-600" role="alert">
            This home sleeps up to {maxGuests} guests in total.
          </p>
        )}
        <div>
          <label htmlFor="message" className="label">
            Anything we should know? <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea id="message" name="message" rows={3} className="input" placeholder="Arrival time, dogs, special occasions…" />
        </div>
      </fieldset>

      <div className="rounded-2xl bg-sand-100 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 shrink-0 rounded accent-gold-600" {...aria("acceptTerms")} />
          <span>
            I agree to the{" "}
            <Link href="/legal/terms" target="_blank" className="font-semibold text-ink underline">
              booking terms
            </Link>
            ,{" "}
            <Link href="/legal/cancellation" target="_blank" className="font-semibold text-ink underline">
              cancellation policy
            </Link>{" "}
            and the home&apos;s house rules.
          </span>
        </label>
        {err("acceptTerms")}
      </div>

      <div>
        <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={pending || overCapacity}>
          {pending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> Reserving your dates…
            </>
          ) : (
            <>
              <Icon name="lock" className="h-4 w-4" /> Continue to payment · {totalLabel}
            </>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-ink-muted">
          {demo
            ? "Demo mode: the next page simulates payment. No card details are requested and no money is taken."
            : "You'll pay securely on Stripe's checkout by card or Pay by Bank. We never see your card or bank login details."}{" "}
          Your dates are held for {holdMinutes} minutes while you pay.{bankTransfer ? " You can also choose to pay by bank transfer on the next step." : ""}
        </p>
      </div>
    </form>
  );
}
