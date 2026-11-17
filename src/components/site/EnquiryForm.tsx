"use client";

import { useActionState } from "react";
import { sendEnquiry } from "@/app/(site)/contact/actions";
import { SubmitButton } from "../SubmitButton";
import { Icon } from "../Icon";

export function EnquiryForm({ properties, defaultProperty }: { properties: { slug: string; name: string }[]; defaultProperty?: string }) {
  const [state, action] = useActionState(sendEnquiry, null);
  if (state?.ok) {
    return (
      <div className="flex flex-col items-center py-10 text-center" role="status">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-olive-50 text-olive-700">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-2xl">Message sent</h2>
        <p className="mt-2 max-w-sm text-ink-soft">{state.message}</p>
      </div>
    );
  }
  const fe = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  const err = (k: string) => (fe[k] ? <p id={`${k}-err`} className="mt-1 text-xs text-danger-600">{fe[k]}</p> : null);
  const aria = (k: string) => (fe[k] ? { "aria-invalid": true, "aria-describedby": `${k}-err` } : {});
  return (
    <form action={action} className="space-y-5" noValidate key={JSON.stringify(state?.values ?? {})}>
      {state && !state.ok && (
        <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
          {state.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input id="name" name="name" defaultValue={v.name} autoComplete="name" className="input" {...aria("name")} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" defaultValue={v.email} type="email" autoComplete="email" className="input" {...aria("email")} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone <span className="font-normal text-ink-muted">(optional)</span></label>
          <input id="phone" name="phone" defaultValue={v.phone} type="tel" autoComplete="tel" className="input" />
        </div>
        <div>
          <label htmlFor="property" className="label">Property <span className="font-normal text-ink-muted">(optional)</span></label>
          <select id="property" name="property" defaultValue={v.property ?? defaultProperty ?? ""} className="input">
            <option value="">Any or not sure</option>
            {properties.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="dates" className="label">Dates <span className="font-normal text-ink-muted">(optional)</span></label>
        <input id="dates" name="dates" defaultValue={v.dates} placeholder="e.g. 3 nights in early May" className="input" />
      </div>
      <div>
        <label htmlFor="message" className="label">Message</label>
        <textarea id="message" name="message" defaultValue={v.message} rows={5} className="input" {...aria("message")} />
        {err("message")}
      </div>
      <div className="hidden" aria-hidden>
        <label>Leave this empty <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <SubmitButton className="btn-primary" pendingLabel="Sending…">Send enquiry</SubmitButton>
    </form>
  );
}
