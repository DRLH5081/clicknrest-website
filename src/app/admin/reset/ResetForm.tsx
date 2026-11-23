"use client";

import { useActionState } from "react";
import { resetPassword } from "../login/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function ResetForm({ token }: { token: string }) {
  const [error, action] = useActionState(resetPassword, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="next" className="label">New password</label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={12} required className="input" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Type it again</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required className="input" />
      </div>
      {error && <p role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
      <SubmitButton className="btn-primary w-full" pendingLabel="Saving…">Save new password</SubmitButton>
    </form>
  );
}
