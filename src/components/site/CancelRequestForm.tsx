"use client";

import { useActionState, useState } from "react";
import { requestCancellationAction } from "@/app/(site)/booking/actions";
import { SubmitButton } from "../SubmitButton";

export function CancelRequestForm({ reference }: { reference: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(requestCancellationAction.bind(null, reference), null);
  if (state?.ok) {
    return (
      <p className="mt-4 rounded-xl bg-olive-50 p-3 text-sm text-olive-700" role="status">
        {state.message}
      </p>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline mt-4">
        Request cancellation
      </button>
    );
  }
  return (
    <form action={action} className="mt-4 space-y-3">
      <label htmlFor="reason" className="label">
        Reason <span className="font-normal text-ink-muted">(optional)</span>
      </label>
      <textarea id="reason" name="reason" rows={3} className="input" />
      {state && !state.ok && (
        <p className="text-sm text-danger-600" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <SubmitButton className="btn-danger" pendingLabel="Sending…">
          Send cancellation request
        </SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Keep my booking
        </button>
      </div>
      <p className="text-xs text-ink-muted">Your booking stays active until we confirm the cancellation by email.</p>
    </form>
  );
}
