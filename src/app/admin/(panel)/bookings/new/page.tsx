import { listAllProperties } from "@/lib/properties";
import { PageHeader, Panel, Flash, Field } from "@/components/admin/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { addManualBooking } from "../../../actions";

export const metadata = { title: "Add booking" };

export default async function NewBookingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const props = listAllProperties(false);
  return (
    <>
      <PageHeader back={{ href: "/admin/bookings", label: "All bookings" }} title="Add a booking" description="For bookings taken by phone, email or another platform. Dates are reserved immediately; minimum stays don't apply." />
      <Flash error={sp.error} />
      <form action={addManualBooking} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="Stay">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Property" name="property_id" className="sm:col-span-3">
                <select id="property_id" name="property_id" defaultValue={sp.property_id ?? ""} required className="input">
                  <option value="" disabled>Choose a property</option>
                  {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Check-in" name="check_in"><input id="check_in" type="date" name="check_in" defaultValue={sp.check_in} required className="input" /></Field>
              <Field label="Check-out" name="check_out"><input id="check_out" type="date" name="check_out" defaultValue={sp.check_out} required className="input" /></Field>
              <Field label="Source" name="source">
                <select id="source" name="source" defaultValue={sp.source ?? "phone"} className="input">
                  {["phone", "email", "in person", "airbnb", "booking.com", "vrbo", "other"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Adults" name="adults"><input id="adults" type="number" min={1} name="adults" defaultValue={sp.adults ?? 2} className="input" /></Field>
              <Field label="Children" name="children"><input id="children" type="number" min={0} name="children" defaultValue={sp.children ?? 0} className="input" /></Field>
            </div>
          </Panel>
          <Panel title="Guest">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="name" className="sm:col-span-2"><input id="name" name="name" defaultValue={sp.name} required className="input" /></Field>
              <Field label="Email" name="email"><input id="email" type="email" name="email" defaultValue={sp.email} required className="input" /></Field>
              <Field label="Phone" name="phone"><input id="phone" name="phone" defaultValue={sp.phone} className="input" /></Field>
              <Field label="Private notes" name="notes" className="sm:col-span-2"><textarea id="notes" name="notes" rows={3} defaultValue={sp.notes} className="input" /></Field>
            </div>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Price & payment">
            <div className="space-y-4">
              <Field label="Agreed total (optional)" name="total_override" hint="Leave blank to use your normal rates for these dates.">
                <input id="total_override" name="total_override" inputMode="decimal" defaultValue={sp.total_override} className="input" />
              </Field>
              <Field label="Payment" name="payment_status">
                <select id="payment_status" name="payment_status" defaultValue={sp.payment_status ?? "unpaid"} className="input">
                  <option value="unpaid">Not yet paid</option>
                  <option value="paid_offline">Already paid (bank transfer, other platform…)</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="send_confirmation" className="accent-gold-600" /> Email a confirmation to the guest</label>
              <SubmitButton className="btn-primary w-full" pendingLabel="Adding…">Add booking</SubmitButton>
            </div>
          </Panel>
        </div>
      </form>
    </>
  );
}
