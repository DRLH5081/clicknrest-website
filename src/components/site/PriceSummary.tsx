import type { PriceBreakdown } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";

/** Transparent price breakdown. Works in server and client components. */
export function PriceSummary({ b, locale, compact = false }: { b: PriceBreakdown; locale: string; compact?: boolean }) {
  const fmt = (n: number) => formatMoney(n, b.currency, locale);
  // Group consecutive identical rates: "3 nights × £175 (Standard)"
  const groups: { rate: number; label: string; count: number }[] = [];
  for (const n of b.nights) {
    const g = groups.find((x) => x.rate === n.rate && x.label === n.label);
    if (g) g.count++;
    else groups.push({ rate: n.rate, label: n.label, count: 1 });
  }
  return (
    <dl className={`space-y-2.5 text-sm ${compact ? "" : ""}`}>
      {groups.map((g, i) => (
        <div key={i} className="flex justify-between gap-4">
          <dt className="text-ink-soft">
            {g.count} {g.count === 1 ? "night" : "nights"} × {fmt(g.rate)}
            {g.label !== "Standard" && <span className="text-ink-muted"> · {g.label}</span>}
          </dt>
          <dd className="tabular-nums">{fmt(g.rate * g.count)}</dd>
        </div>
      ))}
      {b.cleaningFee > 0 && (
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Cleaning fee</dt>
          <dd className="tabular-nums">{fmt(b.cleaningFee)}</dd>
        </div>
      )}
      {b.tax.mode === "added" && b.tax.amount > 0 && (
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">
            {b.tax.name} ({b.tax.ratePercent}%)
          </dt>
          <dd className="tabular-nums">{fmt(b.tax.amount)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4 border-t border-sand-200 pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{fmt(b.total)}</dd>
      </div>
      {b.tax.mode === "included" && b.tax.amount > 0 && (
        <p className="text-xs text-ink-muted">
          Includes {b.tax.name} at {b.tax.ratePercent}% ({fmt(b.tax.amount)}). No booking fees.
        </p>
      )}
      {b.tax.mode !== "included" && <p className="text-xs text-ink-muted">No booking fees.</p>}
    </dl>
  );
}
