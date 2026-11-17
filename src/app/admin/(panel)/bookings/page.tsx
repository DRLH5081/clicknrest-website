import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { formatDate, todayIn } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { listAllProperties } from "@/lib/properties";
import { releaseExpiredHolds } from "@/lib/availability";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Bookings" };

type SP = Record<string, string | undefined>;
const VIEWS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "attention", label: "Needs attention" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];
const PAGE = 25;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  releaseExpiredHolds();
  const { currency, locale, timeZone } = getSetting("regional");
  const today = todayIn(timeZone);
  const view = VIEWS.some((v) => v.key === sp.view) ? sp.view! : "upcoming";
  const q = (sp.q ?? "").trim();
  const pid = Number(sp.property) || 0;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (view === "upcoming") { where.push("b.check_out >= ? AND b.status IN ('confirmed','pending')"); args.push(today); }
  if (view === "past") { where.push("b.check_out < ? AND b.status = 'confirmed'"); args.push(today); }
  if (view === "cancelled") where.push("b.status IN ('cancelled','expired')");
  if (view === "attention") where.push("((b.cancellation_requested_at IS NOT NULL AND b.status = 'confirmed') OR b.needs_attention != '' OR (b.status = 'confirmed' AND b.payment_status = 'unpaid') OR (b.status = 'pending' AND b.payment_method = 'bank_transfer'))");
  if (pid) { where.push("b.property_id = ?"); args.push(pid); }
  if (q) { where.push("(b.reference LIKE ? OR b.guest_name LIKE ? OR b.guest_email LIKE ?)"); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const order = view === "upcoming" || view === "attention" ? "b.check_in ASC" : "b.check_in DESC";
  const db = getDb();
  const total = (db.prepare(`SELECT COUNT(*) c FROM bookings b ${w}`).get(...args) as { c: number }).c;
  const rows = db
    .prepare(`SELECT b.*, p.name AS property_name FROM bookings b JOIN properties p ON p.id = b.property_id ${w} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...args, PAGE, (page - 1) * PAGE) as (Record<string, never> & { reference: string; guest_name: string; guest_email: string; property_name: string; check_in: string; check_out: string; nights: number; total: number; status: string; payment_status: string; payment_method: string; source: string; cancellation_requested_at: string | null; needs_attention: string; is_demo: number; currency: string })[];
  const props = listAllProperties();
  const link = (over: SP) => {
    const p = new URLSearchParams({ view, ...(q ? { q } : {}), ...(pid ? { property: String(pid) } : {}), ...over } as Record<string, string>);
    return `/admin/bookings?${p}`;
  };

  return (
    <>
      <PageHeader title="Bookings" description={`${total} ${total === 1 ? "booking" : "bookings"}`} actions={<Link href="/admin/bookings/new" className="btn-primary"><Icon name="plus" className="h-4 w-4" /> Add booking</Link>} />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-1.5" aria-label="Booking views">
          {VIEWS.map((v) => (
            <Link key={v.key} href={link({ view: v.key, page: "1" })} aria-current={view === v.key ? "page" : undefined} className={`rounded-full px-3.5 py-1.5 text-sm ${view === v.key ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-sand-200 hover:ring-ink"}`}>
              {v.label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          <input type="hidden" name="view" value={view} />
          <select name="property" defaultValue={pid || ""} className="input w-auto" aria-label="Property">
            <option value="">All properties</option>
            {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input name="q" defaultValue={q} placeholder="Name, email or reference" className="input w-56" aria-label="Search bookings" />
          <button className="btn-dark">Search</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="px-5 py-3 font-medium">Guest</th>
              <th className="px-3 py-3 font-medium">Property</th>
              <th className="px-3 py-3 font-medium">Dates</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Payment</th>
              <th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {rows.map((r) => (
              <tr key={r.reference} className="hover:bg-sand-50">
                <td className="px-5 py-3">
                  <Link href={`/admin/bookings/${r.reference}`} className="font-medium hover:underline">{r.guest_name}</Link>
                  <div className="text-xs text-ink-muted">
                    <span className="font-mono">{r.reference}</span> · {r.source}
                    {r.is_demo ? <span className="ml-1 rounded bg-sand-200 px-1">demo</span> : null}
                  </div>
                </td>
                <td className="px-3 py-3">{r.property_name}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {formatDate(r.check_in, locale, { day: "numeric", month: "short" })} – {formatDate(r.check_out, locale, { day: "numeric", month: "short", year: "2-digit" })}
                  <div className="text-xs text-ink-muted">{r.nights} nights</div>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} />
                  {r.cancellation_requested_at && r.status === "confirmed" && <div className="mt-1 text-xs font-medium text-gold-700">Cancellation requested</div>}
                  {r.status === "pending" && r.payment_method === "bank_transfer" && <div className="mt-1 text-xs font-medium text-amber-700">Awaiting bank transfer</div>}
                  {r.needs_attention && <div className="mt-1 text-xs font-medium text-danger-700">Needs attention</div>}
                </td>
                <td className="px-3 py-3"><StatusBadge status={r.payment_status} /></td>
                <td className="px-5 py-3 text-right tabular-nums">{formatMoney(r.total, r.currency || currency, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-10 text-center text-sm text-ink-muted">No bookings match this view.</p>}
      </div>
      {total > PAGE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-muted">Page {page} of {Math.ceil(total / PAGE)}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="btn-outline btn-sm" href={link({ page: String(page - 1) })}>Previous</Link>}
            {page * PAGE < total && <Link className="btn-outline btn-sm" href={link({ page: String(page + 1) })}>Next</Link>}
          </div>
        </div>
      )}
    </>
  );
}
