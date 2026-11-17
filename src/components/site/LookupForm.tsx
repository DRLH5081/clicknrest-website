"use client";

import { useActionState } from "react";
import { lookupBooking } from "@/app/(site)/booking/actions";
import { SubmitButton } from "../SubmitButton";

export function LookupForm() {
  const [state, action] = useActionState(lookupBooking, null);
  return (
    <form action={action} className="space-y-5" key={JSON.stringify(state?.values ?? {})}>
      <div>
        <label htmlFor="reference" className="label">
          Booking reference
        </label>
        <input id="reference" name="reference" required placeholder="CNR-XXXXXX" defaultValue={state?.values?.reference} autoCapitalize="characters" className="input font-mono uppercase tracking-wide" />
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email address
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className="input" />
      </div>
      {state && !state.ok && (
        <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
          {state.message}
        </p>
      )}
      <SubmitButton className="btn-primary w-full" pendingLabel="Finding your booking…">
        Find my booking
      </SubmitButton>
    </form>
  );
}
