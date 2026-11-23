"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../login/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function ForgotForm() {
  const [msg, action] = useActionState(requestPasswordReset, null);
  if (msg) return <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>;
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input" />
      </div>
      <SubmitButton className="btn-primary w-full" pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
