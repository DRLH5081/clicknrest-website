import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getBookingWithProperty, breakdownOf } from "@/lib/bookings";
import { hasGuestAccess } from "@/lib/auth";
import { getSetting, bankTransferAvailable, bankDetailsArePlaceholders } from "@/lib/settings";
import { getPropertyById } from "@/lib/properties";
import { formatMoney } from "@/lib/format";
import { releaseExpiredHolds } from "@/lib/availability";
import { StaySummary } from "@/components/site/StaySummary";
import { Icon } from "@/components/Icon";
import { SubmitButton } from "@/components/SubmitButton";
import { BankDetails, formatDeadline } from "@/components/site/BankDetails";
import { simulatePayment, resumeStripePayment, payByBankTransfer } from "../../booking/actions";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default async function PayPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { ref } = await params;
  const sp = await searchParams;
  releaseExpiredHolds();
  const b = getBookingWithProperty(ref);
  if (!b) notFound();
  if (!(await hasGuestAccess(b.reference))) redirect("/booking/manage?error=access");
  if (b.status !== "pending") redirect(`/booking/${b.reference}`);
  const p = getPropertyById(b.property_id)!;
  const { locale, timeZone } = getSetting("regional");
  const payments = getSetting("payments");
  const total = formatMoney(b.total, b.currency, locale);
  const minutesLeft = b.hold_expires_at ? Math.max(0, Math.round((new Date(b.hold_expires_at).getTime() - Date.now()) / 60000)) : null;
  const byTransfer = b.payment_method === "bank_transfer";
  const offerTransfer = !byTransfer && bankTransferAvailable(payments);
  const holdText =
    minutesLeft == null ? null : minutesLeft > 90 ? `Your dates are held until ${formatDeadline(b.hold_expires_at!, locale, timeZone)}.` : `Your dates are held for another ${minutesLeft} minutes.`;

  return (
    <div className="container-x max-w-5xl pt-8 md:pt-12">
      <h1 className="font-display text-3xl md:text-4xl">Payment</h1>
      <p className="mt-2 text-ink-soft">
        Booking reference <strong className="font-semibold text-ink">{b.reference}</strong>
        {holdText && <> · {holdText}</>}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          {sp.failed && (
            <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl bg-danger-50 p-4 text-sm text-danger-700">
              <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                <strong>The payment didn&apos;t go through.</strong> Nothing has been charged. Your dates are still held, so you can try again.
              </p>
            </div>
          )}
          {sp.cancelled && (
            <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
              <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Payment was cancelled and nothing has been charged. Your dates are held for a little longer if you&apos;d like to try again.</p>
            </div>
          )}

          {byTransfer && (
            <div className="card p-6 md:p-8">
              {sp.transfer && (
                <p role="status" className="mb-5 flex items-center gap-2 rounded-2xl bg-olive-50 p-3 text-sm text-olive-700">
                  <Icon name="check" className="h-4 w-4 shrink-0" /> We&apos;ve emailed these details to {b.guest_email}.
                </p>
              )}
              <h2 className="font-display text-2xl">Pay by bank transfer</h2>
              <p className="mt-2 text-sm text-ink-soft">Send {total} from your bank&apos;s app or website using the details below.</p>
              <div className="mt-6">
                <BankDetails payments={payments} reference={b.reference} amount={total} holdUntil={b.hold_expires_at} locale={locale} timeZone={timeZone} demo={b.payment_mode === "demo" || bankDetailsArePlaceholders(payments)} />
              </div>
            </div>
          )}
          {byTransfer && <h2 className="mb-3 mt-10 font-display text-xl">Prefer to pay by card?</h2>}
          {b.payment_mode === "demo" ? (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-3 bg-amber-50 px-6 py-4 text-amber-700">
                <Icon name="info" className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  <strong>Demo payment page.</strong> This website isn&apos;t connected to a payment provider yet, so this step is simulated. No card details are requested and no money is taken.
                </p>
              </div>
              <div className="p-6 md:p-8">
                <p className="text-sm text-ink-muted">Amount due</p>
                <p className="font-display text-4xl">{total}</p>
                <p className="mt-4 text-sm text-ink-soft">
                  After launch, this step sends guests to Stripe&apos;s secure checkout, where they pay by card or with Pay by Bank (approving the payment in their banking app). Choose an outcome to preview what guests will see.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap [&_button]:whitespace-nowrap">
                  <form action={simulatePayment.bind(null, b.reference, "success")}>
                    <SubmitButton className="btn-primary w-full sm:w-auto" pendingLabel="Confirming…">
                      <Icon name="check" className="h-4 w-4" /> Simulate successful payment
                    </SubmitButton>
                  </form>
                  <form action={simulatePayment.bind(null, b.reference, "pay_by_bank")}>
                    <SubmitButton className="btn-outline w-full sm:w-auto" pendingLabel="Confirming…">
                      Simulate Pay by Bank
                    </SubmitButton>
                  </form>
                  <form action={simulatePayment.bind(null, b.reference, "failure")}>
                    <SubmitButton className="btn-outline w-full sm:w-auto" pendingLabel="Processing…">
                      Simulate declined payment
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-6 md:p-8">
              <p className="text-sm text-ink-muted">Amount due</p>
              <p className="font-display text-4xl">{total}</p>
              <p className="mt-4 text-sm text-ink-soft">You&apos;ll be taken to Stripe&apos;s secure checkout. Pay by card, or choose Pay by Bank to pay straight from your bank account by approving it in your banking app. We never see or store your card or bank login details.</p>
              <form action={resumeStripePayment.bind(null, b.reference)} className="mt-6">
                <SubmitButton className="btn-primary" pendingLabel="Opening secure checkout…">
                  <Icon name="lock" className="h-4 w-4" /> Pay {total} securely
                </SubmitButton>
              </form>
            </div>
          )}
          {offerTransfer && (
            <div className="card mt-6 p-6 md:p-8">
              <h2 className="font-display text-xl">Or pay by bank transfer</h2>
              <p className="mt-2 text-sm text-ink-soft">
                We&apos;ll show you our bank details and hold your dates for {payments.transferHoldHours} hours while the money arrives. Your booking is confirmed by email as soon as it does.
              </p>
              <form action={payByBankTransfer.bind(null, b.reference)} className="mt-5">
                <SubmitButton className="btn-outline" pendingLabel="Getting bank details…">
                  Pay by bank transfer
                </SubmitButton>
              </form>
            </div>
          )}
        </div>
        <aside>
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
