import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getBookingWithProperty, breakdownOf, policyRefund } from "@/lib/bookings";
import { getSetting } from "@/lib/settings";
import { formatDate, todayIn } from "@/lib/dates";
import { formatMoney, minorToInput } from "@/lib/format";
import { PageHeader, Panel, StatusBadge, Flash } from "@/components/admin/ui";
import { PriceSummary } from "@/components/site/PriceSummary";
import { SubmitButton } from "@/components/SubmitButton";
import { bookingAction } from "../../../actions";

export const metadata = { title: "Booking" };

export default async function AdminBookingPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { ref } = await params;
  const sp = await searchParams;
  const b = getBookingWithProperty(ref);
  if (!b) notFound();
  const { locale, timeZone } = getSetting("regional");
  const fmt = (n: number) => formatMoney(n, b.currency, locale);
  const db = getDb();
  const events = db.prepare("SELECT * FROM booking_events WHERE booking_id = ? ORDER BY created_at DESC, id DESC").all(b.id) as { id: number; message: string; actor: string; created_at: string }[];
  const payments = db.prepare("SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at, id").all(b.id) as { id: number; kind: string; amount: number; provider: string; provider_ref: string; note: string; created_at: string }[];
  const emails = db.prepare("SELECT id, to_address, subject, status, created_at FROM email_outbox WHERE booking_id = ? ORDER BY id DESC").all(b.id) as { id: number; to_address: string; subject: string; status: string; created_at: string }[];
  const refundable = b.amount_paid - b.amount_refunded;
  const suggestion = policyRefund(b, todayIn(timeZone));
  const act = bookingAction.bind(null, b.reference);
  const dt = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z"));
  const bd = breakdownOf(b);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/bookings", label: "All bookings" }}
        title={b.guest_name}
        description={`${b.reference} · ${b.property_name} · booked ${dt(b.created_at)} via ${b.source}`}
        actions={
          <>
            <StatusBadge status={b.status} />
            <StatusBadge status={b.payment_status} />
          </>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />
      {b.is_demo ? <p className="mb-6 rounded-xl bg-sand-50 p-3 text-xs text-ink-muted ring-1 ring-sand-200">Demonstration booking created by the seed script.</p> : null}
      {b.payment_mode === "demo" && !b.is_demo && b.payment_status !== "unpaid" ? (
        <p className="mb-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">This booking was paid through the simulated demo payment page. No money was taken.</p>
      ) : null}

      {b.needs_attention && (
        <div className="mb-6 rounded-2xl bg-danger-50 p-4 text-sm text-danger-700" role="alert">
          <p className="font-semibold">Needs attention</p>
          <p className="mt-1">{b.needs_attention}</p>
          <form action={act} className="mt-3"><input type="hidden" name="_action" value="clear_attention" /><SubmitButton className="btn-outline btn-sm">Mark resolved</SubmitButton></form>
        </div>
      )}
      {b.cancellation_requested_at && b.status === "confirmed" && (
        <div className="mb-6 rounded-2xl bg-gold-50 p-4 text-sm text-gold-700">
          <p className="font-semibold">The guest asked to cancel on {dt(b.cancellation_requested_at)}</p>
          {b.cancellation_reason && <p className="mt-1">“{b.cancellation_reason}”</p>}
          <p className="mt-1">Under your policy: {suggestion.explanation} Suggested refund {fmt(suggestion.amount)}. Use “Cancel booking” below to confirm, or close the request.</p>
          <form action={act} className="mt-3"><input type="hidden" name="_action" value="decline_cancel" /><SubmitButton className="btn-outline btn-sm" confirm="Close the request without cancelling? Remember to tell the guest.">Close request without cancelling</SubmitButton></form>
        </div>
      )}

      {b.payment_method === "bank_transfer" && (b.status === "pending" || (b.status === "expired" && b.payment_status === "unpaid")) && (
        <div className="mb-6 rounded-2xl bg-amber-50 p-5 text-sm text-amber-700 ring-1 ring-amber-700/20">
          <p className="font-semibold">
            {b.status === "pending" ? `Awaiting a bank transfer of ${fmt(b.total)} with reference ${b.reference}` : `The transfer hold expired and the dates were released`}
          </p>
          <p className="mt-1">
            {b.status === "pending" && b.hold_expires_at
              ? `Dates held until ${dt(b.hold_expires_at)}. Check your bank account, then confirm the booking here. The guest gets their confirmation email straight away.`
              : "If the money arrives late, you can still record it. The dates are re-reserved if they're still free, otherwise the booking is flagged so you can refund the guest."}
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <form action={act} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="_action" value="confirm_transfer" />
              <label className="text-sm text-ink">Bank reference (optional)<input name="transfer_ref" className="input mt-1 w-48" placeholder="e.g. FPS ID" /></label>
              <SubmitButton className="btn-primary" confirm={`Only continue if ${fmt(b.total)} is in your bank account. Confirm the booking and email the guest?`}>Mark transfer received</SubmitButton>
            </form>
            {b.status === "pending" && (
              <form action={act}>
                <input type="hidden" name="_action" value="extend_hold" />
                <input type="hidden" name="hours" value="24" />
                <SubmitButton className="btn-outline">Hold 24 hours longer</SubmitButton>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Stay">
            <dl className="grid gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-ink-muted">Check-in</dt><dd className="mt-1 font-medium">{formatDate(b.check_in, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</dd></div>
              <div><dt className="text-ink-muted">Check-out</dt><dd className="mt-1 font-medium">{formatDate(b.check_out, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</dd></div>
              <div><dt className="text-ink-muted">Nights</dt><dd className="mt-1 font-medium">{b.nights}</dd></div>
              <div><dt className="text-ink-muted">Guests</dt><dd className="mt-1 font-medium">{b.adults} adults{b.children ? `, ${b.children} children` : ""}</dd></div>
            </dl>
            <p className="mt-4 text-sm"><Link className="text-gold-600 underline" href={`/admin/calendar?month=${b.check_in.slice(0, 7)}`}>View on calendar</Link></p>
          </Panel>
          <Panel title="Guest">
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-ink-muted">Email</dt><dd className="mt-1 break-all"><a className="underline" href={`mailto:${b.guest_email}`}>{b.guest_email}</a></dd></div>
              <div><dt className="text-ink-muted">Phone</dt><dd className="mt-1">{b.guest_phone ? <a className="underline" href={`tel:${b.guest_phone}`}>{b.guest_phone}</a> : "—"}</dd></div>
              <div><dt className="text-ink-muted">Source</dt><dd className="mt-1 capitalize">{b.source}</dd></div>
              {b.guest_message && <div className="sm:col-span-3"><dt className="text-ink-muted">Message from guest</dt><dd className="mt-1 whitespace-pre-line">{b.guest_message}</dd></div>}
            </dl>
          </Panel>

          <Panel title="Payments & refunds" description={b.payment_method === "bank_transfer" && b.payment_mode !== "demo" ? "Paid by bank transfer: refunds are recorded here; send the money back to the guest from your bank." : b.payment_mode === "stripe" ? "Refunds are sent through Stripe to the guest's card." : b.payment_mode === "demo" ? "Demo payments: refunds here are simulated." : "Offline payment: refunds are recorded here; pay the guest back by the method they used."}>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-sand-200">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 text-ink-muted">{dt(p.created_at)}</td>
                    <td className="py-2 pr-3"><span className="capitalize">{p.kind}</span> <span className="text-xs text-ink-muted">({p.provider}{p.provider_ref ? ` · ${p.provider_ref}` : ""})</span>{p.note && <div className="text-xs text-ink-muted">{p.note}</div>}</td>
                    <td className={`py-2 text-right tabular-nums ${p.kind === "refund" ? "text-danger-700" : ""}`}>{p.kind === "refund" ? "−" : ""}{fmt(p.amount)}</td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td className="py-3 text-ink-muted">No payments recorded.</td></tr>}
              </tbody>
            </table>
            <div className="mt-4 flex flex-wrap gap-6 border-t border-sand-200 pt-4 text-sm">
              <span>Total <strong className="tabular-nums">{fmt(b.total)}</strong></span>
              <span>Paid <strong className="tabular-nums">{fmt(b.amount_paid)}</strong></span>
              <span>Refunded <strong className="tabular-nums">{fmt(b.amount_refunded)}</strong></span>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {b.payment_status === "unpaid" && b.status === "confirmed" && (
                <form action={act}><input type="hidden" name="_action" value="mark_paid" /><SubmitButton className="btn-outline">Mark as paid (offline)</SubmitButton></form>
              )}
              {refundable > 0 && b.status !== "cancelled" && (
                <details className="w-full rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
                  <summary className="cursor-pointer text-sm font-semibold">Issue a refund without cancelling</summary>
                  <form action={act} className="mt-4 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="_action" value="refund" />
                    <label className="text-sm">Amount<input name="refund_amount" inputMode="decimal" className="input mt-1 w-36" placeholder={minorToInput(refundable)} /></label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="accent-gold-600" /> Email the guest</label>
                    <SubmitButton className="btn-dark" confirm="Issue this refund?">Refund</SubmitButton>
                  </form>
                </details>
              )}
              {refundable > 0 && b.status === "cancelled" && (
                <form action={act} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="_action" value="refund" />
                  <label className="text-sm">Further refund<input name="refund_amount" inputMode="decimal" className="input mt-1 w-36" placeholder={minorToInput(refundable)} /></label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="accent-gold-600" /> Email the guest</label>
                  <SubmitButton className="btn-dark" confirm="Issue this refund?">Refund</SubmitButton>
                </form>
              )}
            </div>
          </Panel>

          {(b.status === "confirmed" || b.status === "pending") && (
            <Panel title="Cancel booking" description="Releases the dates. Optionally refund through the payment provider and email the guest.">
              <form action={act} className="space-y-4">
                <input type="hidden" name="_action" value="cancel" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    Refund amount
                    <input name="refund_amount" inputMode="decimal" defaultValue={minorToInput(suggestion.amount)} className="input mt-1" />
                    <span className="hint block">{suggestion.explanation} Maximum {fmt(refundable)}.</span>
                  </label>
                  <label className="text-sm">
                    Reason (internal)
                    <input name="reason" className="input mt-1" placeholder="e.g. Guest request" />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="accent-gold-600" /> Email the guest and owner</label>
                <SubmitButton className="btn-danger" pendingLabel="Cancelling…" confirm="Cancel this booking and release the dates? This can't be undone.">Cancel booking</SubmitButton>
              </form>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          {bd && <Panel title="Price"><PriceSummary b={bd} locale={locale} /></Panel>}
          <Panel title="Private notes">
            <form action={act} className="space-y-3">
              <input type="hidden" name="_action" value="notes" />
              <textarea name="admin_notes" rows={4} defaultValue={b.admin_notes} className="input" placeholder="Only visible to you" />
              <SubmitButton className="btn-outline btn-sm">Save notes</SubmitButton>
            </form>
          </Panel>
          {b.status === "confirmed" && (
            <Panel title="Guest emails">
              <form action={act}><input type="hidden" name="_action" value="resend" /><SubmitButton className="btn-outline btn-sm">Re-send confirmation</SubmitButton></form>
              <ul className="mt-4 space-y-2 text-xs">
                {emails.map((e) => <li key={e.id}><Link className="hover:underline" href={`/admin/emails?id=${e.id}`}>{e.subject}</Link> <span className="text-ink-muted">→ {e.to_address} · {e.status === "logged_demo" ? "logged (demo)" : e.status}</span></li>)}
              </ul>
            </Panel>
          )}
          <Panel title="History">
            <ol className="space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-l-2 border-sand-300 pl-3">
                  <p>{e.message}</p>
                  <p className="text-xs text-ink-muted">{dt(e.created_at)} · {e.actor}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
