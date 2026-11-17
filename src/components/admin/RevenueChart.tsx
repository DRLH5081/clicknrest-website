import { formatMoney } from "@/lib/format";
import { formatDate } from "@/lib/dates";

/** Single-series column chart: net revenue by check-in month. Hover a column for exact values; a data table is provided for screen readers. */
export function RevenueChart({ data, currency, locale, currentMonth }: { data: { month: string; revenue: number; bookings: number }[]; currency: string; locale: string; currentMonth: string }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const ticks = [0, 0.5, 1].map((t) => t * top);
  const label = (m: string) => formatDate(m, locale, { month: "short" });
  return (
    <figure>
      <div className="relative h-56 pl-14" aria-hidden="true">
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="w-14 -translate-y-0 pr-2 text-right text-[11px] tabular-nums text-ink-muted">{formatMoney(t, currency, locale, { whole: true })}</span>
            <span className="h-px flex-1 bg-sand-200" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-14 right-0 flex items-end gap-[2px]">
          {data.map((d) => (
            <div key={d.month} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-[36px] rounded-t-[4px] transition-colors ${d.month === currentMonth ? "bg-gold-600" : d.month > currentMonth ? "bg-gold-100" : "bg-gold-500/80"} group-hover:bg-gold-700`}
                style={{ height: `${Math.max(d.revenue > 0 ? 1 : 0, (d.revenue / top) * 100)}%` }}
              />
              <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lift group-hover:block">
                <strong>{formatDate(d.month, locale, { month: "long", year: "numeric" })}</strong>
                <br />
                {formatMoney(d.revenue, currency, locale, { whole: true })} · {d.bookings} {d.bookings === 1 ? "booking" : "bookings"}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-[2px] pl-14 pt-2" aria-hidden="true">
        {data.map((d) => (
          <span key={d.month} className={`flex-1 text-center text-[11px] ${d.month === currentMonth ? "font-semibold text-ink" : "text-ink-muted"}`}>
            {label(d.month)}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-xs text-ink-muted">Net revenue (paid minus refunds) by month of check-in. Lighter columns are future months with bookings already paid.</figcaption>
      <table className="sr-only">
        <caption>Net revenue by month of check-in</caption>
        <thead><tr><th>Month</th><th>Revenue</th><th>Bookings</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}><td>{formatDate(d.month, locale, { month: "long", year: "numeric" })}</td><td>{formatMoney(d.revenue, currency, locale)}</td><td>{d.bookings}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
