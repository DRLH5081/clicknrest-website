import Link from "next/link";
import { Icon } from "../Icon";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <Icon name="arrowLeft" className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, description, children, className = "" }: { title?: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-6 ${className}`}>
      {title && <h2 className="font-display text-lg">{title}</h2>}
      {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      <div className={title ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-olive-50 text-olive-700",
  pending: "bg-amber-50 text-amber-700",
  cancelled: "bg-sand-200 text-ink-soft",
  expired: "bg-sand-200 text-ink-muted",
  paid: "bg-olive-50 text-olive-700",
  paid_offline: "bg-olive-50 text-olive-700",
  unpaid: "bg-amber-50 text-amber-700",
  failed: "bg-danger-50 text-danger-700",
  refunded: "bg-sand-200 text-ink-soft",
  partially_refunded: "bg-sand-200 text-ink-soft",
  published: "bg-olive-50 text-olive-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-sand-200 text-ink-muted",
  new: "bg-gold-50 text-gold-700",
  replied: "bg-olive-50 text-olive-700",
  closed: "bg-sand-200 text-ink-muted",
};
const LABELS: Record<string, string> = { paid_offline: "Paid (offline)", partially_refunded: "Part refunded" };

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? "bg-sand-200 text-ink-soft"}`}>{LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export function Field({ label, name, hint, children, className = "" }: { label: string; name?: string; hint?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p role="alert" className="mb-6 flex items-start gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger-700"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>;
  if (ok) return <p role="status" className="mb-6 flex items-start gap-2 rounded-xl bg-olive-50 p-3 text-sm text-olive-700"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />{ok}</p>;
  return null;
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}
