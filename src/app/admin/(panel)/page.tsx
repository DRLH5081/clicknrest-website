import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { addDays, addMonths, formatDate, startOfMonth, todayIn } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { listAllProperties } from "@/lib/properties";
import { occupancy, propertyRevenue, revenueByMonth } from "@/lib/reports";
import { PageHeader, Panel, Stat, StatusBadge } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { Icon } from "@/components/Icon";

type Row = { reference: string; guest_name: string; check_in: string; check_out: string; property_name: string; status: string; payment_status: string; is_demo: number };

export default function AdminOverview() {
  const { currency, locale, timeZone } = getSetting("regional");
  const today = todayIn(timeZone);
  const month = startOfMonth(today);
  const db = getDb();
  const fmt = (n: number) => formatMoney(n, currency, locale, { whole: true });
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const months = revenueByMonth(addMonths(month, -11), 14);
  const thisMonth = months.find((m) => m.month === month)!;
  const lastMonth = months.find((m) => m.month === addMonths(month, -1))!;
  const yearRevenue = months.filter((m) => m.month <= month).reduce((s, m) => s + m.revenue, 0);
  const occ30 = occupancy(today, addDays(today, 30));
  const occMonth = occupancy(month, addMonths(month, 1));

  const arrivals = db
    .prepare(
      `SELECT b.reference, b.guest_name, b.check_in, b.check_out, p.name AS property_name, b.status, b.payment_status, b.is_demo
         FROM bookings b JOIN properties p ON p.id = b.property_id
        WHERE b.status = 'confirmed' AND b.check_in >= ? AND b.check_in < ? ORDER BY b.check_in LIMIT 8`,
    )
    .all(today, addDays(today, 14)) as Row[];
  const attention = db
    .prepare(
      `SELECT b.reference, b.guest_name, b.check_in, b.check_out, p.name AS property_name, b.status, b.payment_status, b.is_demo
         FROM bookings b JOIN properties p ON p.id = b.property_id
        WHERE (b.cancellation_requested_at IS NOT NULL AND b.status = 'confirmed') OR b.needs_attention != ''
           OR (b.status = 'confirmed' AND b.payment_status = 'unpaid')
        ORDER BY b.check_in LIMIT 8`,
    )
    .all() as Row[];
  const recent = db
    .prepare(
      `SELECT b.reference, b.guest_name, b.check_in, b.check_out, p.name AS property_name, b.status, b.payment_status, b.is_demo
         FROM bookings b JOIN properties p ON p.id = b.property_id WHERE b.status != 'expired' ORDER BY b.created_at DESC LIMIT 6`,
    )
    .all() as Row[];
  const props = listAllProperties(false);
  const demoCount = (db.prepare("SELECT COUNT(*) c FROM bookings WHERE is_demo = 1").get() as { c: number }).c;

  const list = (rows: Row[], empty: string, extra?: (r: Row) => React.ReactNode) =>
    rows.length === 0 ? (
      <p className="py-6 text-center text-sm text-ink-muted">{empty}</p>
    ) : (
      <ul className="divide-y divide-sand-200">
        {rows.map((r) => (
          <li key={r.reference}>
            <Link href={`/admin/bookings/${r.reference}`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-sand-50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.guest_name}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {r.property_name} · {formatDate(r.check_in, locale, { day: "numeric", month: "short" })} – {formatDate(r.check_out, locale, { day: "numeric", month: "short" })}
                </span>
              </span>
              {extra ? extra(r) : <StatusBadge status={r.status} />}
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <PageHeader
        title="Overview"
        description={formatDate(today, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <>
            <Link href="/admin/bookings/new" className="btn-primary"><Icon name="plus" className="h-4 w-4" /> Add booking</Link>
            <Link href="/admin/calendar" className="btn-outline"><Icon name="calendar" className="h-4 w-4" /> Calendar</Link>
          </>
        }
      />
      {demoCount > 0 && (
        <p className="mb-6 rounded-xl bg-sand-50 p-3 text-xs text-ink-muted ring-1 ring-sand-200">
          These figures include {demoCount} demonstration bookings created to show how the dashboard works. Run <code className="rounded bg-sand-200 px-1">npm run db:reset</code> or delete the database before launch to start clean.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue this month" value={fmt(thisMonth.revenue)} sub={`${fmt(lastMonth.revenue)} last month`} />
        <Stat label="Revenue, last 12 months" value={fmt(yearRevenue)} sub="Net of refunds, by check-in" />
        <Stat label="Occupancy, next 30 days" value={pct(occ30)} sub={`${pct(occMonth)} this calendar month`} />
        <Stat label="Arrivals, next 14 days" value={String(arrivals.length)} sub={`${attention.length} booking${attention.length === 1 ? "" : "s"} need attention`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Revenue by month">
          <RevenueChart data={months} currency={currency} locale={locale} currentMonth={month} />
        </Panel>
        <Panel title="Needs attention" description="Cancellation requests, unpaid and flagged bookings">
          {list(attention, "Nothing needs your attention. 🎉", (r) => <StatusBadge status={r.payment_status === "unpaid" ? "unpaid" : "pending"} />)}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Upcoming arrivals">{list(arrivals, "No arrivals in the next two weeks.")}</Panel>
        <Panel title="Latest bookings">{list(recent, "No bookings yet.")}</Panel>
      </div>

      <Panel title="By property" className="mt-6">
        <div className="-mx-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-6 py-2 font-medium">Property</th>
                <th className="px-3 py-2 text-right font-medium">Occupancy next 30 days</th>
                <th className="px-3 py-2 text-right font-medium">Occupancy last 90 days</th>
                <th className="px-6 py-2 text-right font-medium">Revenue, 12 months</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {props.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3"><Link href={`/admin/properties/${p.id}`} className="font-medium hover:underline">{p.name}</Link> {p.status !== "published" && <StatusBadge status={p.status} />}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{pct(occupancy(today, addDays(today, 30), p.id))}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{pct(occupancy(addDays(today, -90), today, p.id))}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{fmt(propertyRevenue(p.id, addMonths(month, -11), addMonths(month, 1)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
