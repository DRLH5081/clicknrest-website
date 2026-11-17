import type { PaymentSettings } from "@/lib/settings";
import { Icon } from "../Icon";

type Props = {
  payments: PaymentSettings;
  reference: string;
  amount: string;
  holdUntil: string | null;
  locale: string;
  timeZone: string;
  demo: boolean;
};

export function formatDeadline(iso: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", weekday: "long", day: "numeric", month: "long", timeZone }).format(new Date(iso));
}

/** Bank details and the payment reference a guest needs to pay by bank transfer. */
export function BankDetails({ payments, reference, amount, holdUntil, locale, timeZone, demo }: Props) {
  const rows: [string, string, boolean?][] = [
    ["Amount", amount],
    ["Account name", payments.accountName],
    ["Sort code", payments.sortCode, true],
    ["Account number", payments.accountNumber, true],
    ["Payment reference", reference, true],
  ];
  if (payments.bankName.trim()) rows.splice(1, 0, ["Bank", payments.bankName]);
  return (
    <div>
      {demo && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700" role="note">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>Demo bank details. Do not send money.</strong> These are placeholders on a demonstration website. The owner adds the real account in the dashboard before launch.
          </p>
        </div>
      )}
      <dl className="divide-y divide-sand-200 rounded-2xl bg-sand-50 px-5 ring-1 ring-sand-200">
        {rows.map(([label, value, mono]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="text-ink-muted">{label}</dt>
            <dd className={`text-right font-semibold ${mono ? "font-mono tracking-wide" : ""}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-5 space-y-2 text-sm text-ink-soft">
        <li className="flex gap-2"><Icon name="tag" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" /> Use <strong className="font-mono text-ink">{reference}</strong> as the payment reference so we can match your payment.</li>
        {holdUntil && (
          <li className="flex gap-2"><Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" /> Please pay by {formatDeadline(holdUntil, locale, timeZone)}. If we haven&apos;t received it by then, the dates are released.</li>
        )}
        <li className="flex gap-2"><Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" /> We&apos;ll email your confirmation as soon as the money arrives.</li>
        <li className="flex gap-2"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" /> We will never email or message you to change these bank details. If anyone does, don&apos;t pay and call us first.</li>
        {payments.transferNote.trim() && <li className="flex gap-2"><Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" /> {payments.transferNote}</li>}
      </ul>
    </div>
  );
}
