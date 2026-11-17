"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ demoHint }: { demoHint: boolean }) {
  const [error, action] = useActionState(login, null);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input" defaultValue={demoHint ? "owner@example.com" : ""} />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      {error && <p role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
      <SubmitButton className="btn-primary w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
      {demoHint && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
          Demo login: <strong>owner@example.com</strong> / <strong>change-me-now</strong>. You&apos;ll be asked to set a new password after signing in.
        </p>
      )}
    </form>
  );
}
