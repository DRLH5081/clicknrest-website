import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBookingWithProperty, breakdownOf, checkAccessToken } from "@/lib/bookings";
import { hasGuestAccess } from "@/lib/auth";
import { getSetting, bankDetailsArePlaceholders } from "@/lib/settings";
import { getPropertyById } from "@/lib/properties";
import { formatMoney } from "@/lib/format";
import { formatDate, todayIn } from "@/lib/dates";
import { releaseExpiredHolds } from "@/lib/availability";
import { StaySummary } from "@/components/site/StaySummary";
import { Icon } from "@/components/Icon";
import { CancelRequestForm } from "@/components/site/CancelRequestForm";
import { PrintButton } from "@/components/site/PrintButton";
import { BankDetails } from "@/components/site/BankDetails";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

const PAYMENT_TEXT: Record<string, string> = {
  unpaid: "Not paid yet",
  paid: "Paid in full",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  failed: "Payment failed",
  paid_offline: "Paid",
};

export default async function BookingPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { ref } = await params;
  const sp = await searchParams;
  releaseExpiredHolds();
  const b = getBookingWithProperty(ref);
  if (!b) notFound();
  const allowed = (await hasGuestAccess(b.reference)) || checkAccessToken(b, sp.token);
  if (!allowed) redirect("/booking/manage?error=access");
  if (sp.token) redirect(`/booking/access?ref=${b.reference}&token=${encodeURIComponent(sp.token)}`);

  const p = getPropertyById(b.property_id)!;
  const { locale, timeZone } = getSetting("regional");
  const policy = getSetting("booking");
  const site = getSetting("site");
  const payments = getSetting("payments");
  const fmt = (n: number) => formatMoney(n, b.currency, locale);
  const demo = b.payment_mode === "demo";
  const justConfirmed = sp.confirmed === "1" && b.status === "confirmed";
  const upcoming = b.check_in >= todayIn(timeZone);

  let hero: { icon: string; tone: string; title: string; body: string };
  if (b.status === "confirmed") {
    hero = justConfirmed
      ? {
          icon: "check",
          tone: "bg-olive-50 text-olive-700",
          title: demo ? "Demo booking confirmed" : "You're booked!",
          body: `We've sent a confirmation to ${b.guest_email}.`,
        }
      : { icon: "check", tone: "bg-olive-50 text-olive-700", title: "Booking confirmed", body: "Your dates are reserved." };
  } else if (b.status === "pending") {
    hero =
      b.payment_method === "bank_transfer"
        ? { icon: "clock", tone: "bg-amber-50 text-amber-700", title: "Awaiting your bank transfer", body: "Your dates are held while your payment arrives. We'll email you as soon as it does." }
        : { icon: "clock", tone: "bg-amber-50 text-amber-700", title: "Awaiting payment", body: "Your dates are held while you complete payment." };
  } else if (b.status === "expired") {
    hero = { icon: "info", tone: "bg-sand-100 text-ink-soft", title: "This booking wasn't completed", body: "Payment wasn't received in time, so the dates were released. You have not been charged." };
  } else {
    hero = { icon: "x", tone: "bg-sand-100 text-ink-soft", title: "Booking cancelled", body: b.amount_refunded > 0 ? `${fmt(b.amount_refunded)} has been refunded to your original payment method.` : "This booking has been cancelled." };
  }

  return (
    <div className="container-x max-w-5xl pt-8 md:pt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${hero.tone} ${justConfirmed ? "animate-fade-up" : ""}`}>
            <Icon name={hero.icon} className="h-7 w-7" strokeWidth={2} />
          </span>
          <div>
            <h1 className="font-display text-3xl md:text-4xl">{hero.title}</h1>
            <p className="mt-1 text-ink-soft">{hero.body}</p>
            <p className="mt-2 text-sm text-ink-muted">
              Booking reference <strong className="font-mono text-base tracking-wide text-ink">{b.reference}</strong>
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      {demo && b.status !== "expired" && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700" role="note">
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>Demonstration booking.</strong> This was made on a demo website with a simulated payment. No money was taken and no real stay has been reserved.
          </p>
        </div>
      )}
      {b.needs_attention && (
        <div className="mt-6 rounded-2xl bg-danger-50 p-4 text-sm text-danger-700" role="alert">
          There&apos;s a problem with this booking that we&apos;re looking into. We&apos;ll contact you shortly.
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {b.status === "pending" && b.payment_method === "bank_transfer" && (
            <div className="card p-6">
              <h2 className="font-display text-xl">Bank transfer details</h2>
              <div className="mt-4">
                <BankDetails payments={payments} reference={b.reference} amount={fmt(b.total)} holdUntil={b.hold_expires_at} locale={locale} timeZone={timeZone} demo={demo || bankDetailsArePlaceholders(payments)} />
              </div>
              <Link href={`/pay/${b.reference}`} className="btn-ghost mt-4 px-0 underline">
                Pay by card instead
              </Link>
            </div>
          )}
          {b.status === "pending" && b.payment_method !== "bank_transfer" && (
            <div className="card p-6">
              <h2 className="font-display text-xl">Complete your payment</h2>
              <p className="mt-2 text-sm text-ink-soft">
                {b.hold_expires_at && <>Your dates are held until {new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(b.hold_expires_at))}. </>}
                The booking is confirmed once payment is received.
              </p>
              <Link href={`/pay/${b.reference}`} className="btn-primary mt-5">
                Continue to payment
              </Link>
            </div>
          )}
          {b.status === "expired" && (
            <Link href={`/stays/${b.property_slug}?checkIn=${b.check_in}&checkOut=${b.check_out}&guests=${b.adults + b.children}`} className="btn-primary">
              Check if the dates are still available
            </Link>
          )}

          <section className="card p-6">
            <h2 className="font-display text-xl">Payment</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-ink-muted">Status</dt>
                <dd className="mt-1 font-semibold">
                  {PAYMENT_TEXT[b.payment_status]}
                  {b.payment_status !== "unpaid" ? (b.payment_method === "bank_transfer" ? " by bank transfer" : b.payment_method === "pay_by_bank" ? " with Pay by Bank" : "") : ""}
                  {demo && b.payment_status !== "unpaid" ? " (simulated)" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Total</dt>
                <dd className="mt-1 font-semibold tabular-nums">{fmt(b.total)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">{b.amount_refunded ? "Refunded" : "Paid"}</dt>
                <dd className="mt-1 font-semibold tabular-nums">{fmt(b.amount_refunded || b.amount_paid)}</dd>
              </div>
            </dl>
            {b.payment_status === "unpaid" && b.payment_mode === "manual" && <p className="mt-4 text-sm text-ink-soft">We&apos;ll contact you about payment for this booking.</p>}
          </section>

          {b.status === "confirmed" && upcoming && (
            <section className="card p-6">
              <h2 className="font-display text-xl">What happens next</h2>
              <ol className="mt-4 space-y-4">
                {[
                  { t: "Confirmation email", d: `Sent to ${b.guest_email} with your booking details and a private link back to this page.` },
                  { t: "Arrival details", d: "Directions, access codes and parking information will be emailed 7 days before check-in." },
                  { t: "Check-in", d: `${formatDate(b.check_in, locale, { weekday: "long", day: "numeric", month: "long" })} from ${p.check_in_time}. ${p.check_in_info}` },
                ].map((s, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-50 text-sm font-semibold text-gold-700">{i + 1}</span>
                    <div className="text-sm">
                      <p className="font-semibold">{s.t}</p>
                      <p className="mt-0.5 text-ink-soft">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="card p-6">
            <h2 className="font-display text-xl">Guest details</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">Name</dt>
                <dd className="mt-1">{b.guest_name}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Email</dt>
                <dd className="mt-1 break-all">{b.guest_email}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Phone</dt>
                <dd className="mt-1">{b.guest_phone || "Not provided"}</dd>
              </div>
              {b.guest_message && (
                <div className="sm:col-span-2">
                  <dt className="text-ink-muted">Your message</dt>
                  <dd className="mt-1 whitespace-pre-line">{b.guest_message}</dd>
                </div>
              )}
            </dl>
          </section>

          {b.status === "confirmed" && (
            <section className="card p-6" aria-labelledby="cancel-heading">
              <h2 id="cancel-heading" className="font-display text-xl">
                Cancellation
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{policy.cancellationSummary}</p>
              {b.cancellation_requested_at ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700" role="status">
                  <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0" />
                  Cancellation requested on {formatDate(b.cancellation_requested_at.slice(0, 10), locale)}. We&apos;ll confirm by email.
                </p>
              ) : upcoming ? (
                <CancelRequestForm reference={b.reference} />
              ) : null}
            </section>
          )}

          <p className="text-sm text-ink-muted">
            Need to change something? Contact us at{" "}
            <a href={`mailto:${site.contactEmail}?subject=${encodeURIComponent("Booking " + b.reference)}`} className="font-semibold text-ink underline">
              {site.contactEmail}
            </a>{" "}
            or {site.contactPhone}, quoting your reference.
          </p>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <StaySummary
            name={b.property_name}
            location={`${p.town}, ${p.region}`}
            image={p.images[0]}
            checkIn={b.check_in}
            checkOut={b.check_out}
            guestsLabel={`${b.adults} adult${b.adults === 1 ? "" : "s"}${b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}`}
            checkInTime={p.check_in_time}
            checkOutTime={p.check_out_time}
            breakdown={breakdownOf(b)}
            locale={locale}
          />
        </aside>
      </div>
    </div>
  );
}
