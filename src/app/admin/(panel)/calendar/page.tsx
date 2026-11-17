import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { addDays, addMonths, daysInMonth, dayOfWeek, formatDate, todayIn } from "@/lib/dates";
import { listAllProperties } from "@/lib/properties";
import { releaseExpiredHolds } from "@/lib/availability";
import { PageHeader, Panel, Flash, Field } from "@/components/admin/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon } from "@/components/Icon";
import { addBlock, removeBlock } from "../../actions";

export const metadata = { title: "Calendar" };

type Night = { property_id: number; night: string; booking_id: number | null; block_id: number | null; status: string | null; guest_name: string | null; reference: string | null; check_in: string | null; reason: string | null };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  releaseExpiredHolds();
  const { locale, timeZone } = getSetting("regional");
  const today = todayIn(timeZone);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? `${sp.month}-01` : today.slice(0, 8) + "01";
  const days = daysInMonth(month);
  const end = addMonths(month, 1);
  const dates = Array.from({ length: days }, (_, i) => addDays(month, i));
  const props = listAllProperties(false);
  const db = getDb();
  const nights = db
    .prepare(
      `SELECT n.property_id, n.night, n.booking_id, n.block_id, b.status, b.guest_name, b.reference, b.check_in, k.reason
         FROM booking_nights n LEFT JOIN bookings b ON b.id = n.booking_id LEFT JOIN blocks k ON k.id = n.block_id
        WHERE n.night >= ? AND n.night < ?`,
    )
    .all(month, end) as Night[];
  const map = new Map(nights.map((n) => [`${n.property_id}:${n.night}`, n]));
  const blocks = db
    .prepare("SELECT k.*, p.name AS property_name FROM blocks k JOIN properties p ON p.id = k.property_id WHERE k.end_date > ? AND k.start_date < ? ORDER BY k.start_date")
    .all(month, end) as { id: number; property_name: string; start_date: string; end_date: string; reason: string }[];
  const back = `/admin/calendar?month=${month.slice(0, 7)}`;
  const ym = (m: string) => m.slice(0, 7);

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Every property at a glance. Click a booking to open it, or an empty night to add a booking."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/admin/calendar?month=${ym(addMonths(month, -1))}`} className="btn-outline h-10 w-10 p-0" aria-label="Previous month"><Icon name="chevronLeft" className="h-4 w-4" /></Link>
            <span className="min-w-[150px] text-center font-display text-lg">{formatDate(month, locale, { month: "long", year: "numeric" })}</span>
            <Link href={`/admin/calendar?month=${ym(addMonths(month, 1))}`} className="btn-outline h-10 w-10 p-0" aria-label="Next month"><Icon name="chevronRight" className="h-4 w-4" /></Link>
            <Link href="/admin/calendar" className="btn-ghost btn-sm">Today</Link>
          </div>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-[170px] border-b border-r border-sand-200 bg-white px-4 py-2 text-left font-medium text-ink-muted">Property</th>
              {dates.map((d) => {
                const dow = dayOfWeek(d);
                return (
                  <th key={d} scope="col" className={`min-w-[34px] border-b border-sand-200 px-0 py-2 text-center font-medium ${d === today ? "text-gold-700" : dow === 0 || dow === 6 ? "text-ink" : "text-ink-muted"}`}>
                    <span className="block text-[10px] uppercase">{formatDate(d, locale, { weekday: "narrow" })}</span>
                    <span className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${d === today ? "bg-gold-600 text-white" : ""}`}>{Number(d.slice(8))}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {props.map((p) => (
              <tr key={p.id}>
                <th scope="row" className="sticky left-0 z-10 border-b border-r border-sand-200 bg-white px-4 py-2 text-left text-sm font-medium">
                  <Link href={`/admin/properties/${p.id}`} className="hover:underline">{p.name}</Link>
                  {p.status !== "published" && <span className="ml-1 text-[10px] uppercase text-amber-700">{p.status}</span>}
                </th>
                {dates.map((d) => {
                  const n = map.get(`${p.id}:${d}`);
                  const past = d < today;
                  if (n?.booking_id) {
                    const start = n.check_in === d || d === month;
                    const color = n.status === "pending" ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-700/30" : "bg-ink text-white";
                    return (
                      <td key={d} className={`border-b border-sand-200 p-0 ${past ? "opacity-60" : ""}`}>
                        <Link href={`/admin/bookings/${n.reference}`} title={`${n.guest_name} · ${n.reference}${n.status === "pending" ? " (awaiting payment)" : ""}`} className={`my-1 flex h-8 items-center overflow-hidden whitespace-nowrap px-1 text-[11px] font-medium ${color} ${start ? "ml-0.5 rounded-l-lg" : ""} ${map.get(`${p.id}:${addDays(d, 1)}`)?.booking_id !== n.booking_id ? "mr-0.5 rounded-r-lg" : ""}`}>
                          {start ? n.guest_name?.split(" ")[0] : ""}
                          <span className="sr-only">{n.guest_name}, {d}</span>
                        </Link>
                      </td>
                    );
                  }
                  if (n?.block_id) {
                    return (
                      <td key={d} className="border-b border-sand-200 p-0">
                        <div title={`Blocked: ${n.reason || "no reason given"}`} className="my-1 h-8 bg-[repeating-linear-gradient(45deg,#E9E0D2_0,#E9E0D2_4px,#F4EEE5_4px,#F4EEE5_8px)]"><span className="sr-only">Blocked {d}</span></div>
                      </td>
                    );
                  }
                  return (
                    <td key={d} className={`border-b border-sand-200 p-0 ${dayOfWeek(d) === 0 || dayOfWeek(d) === 6 ? "bg-sand-50" : ""}`}>
                      {past ? <div className="h-10" /> : (
                        <Link href={`/admin/bookings/new?property_id=${p.id}&check_in=${d}&check_out=${addDays(d, p.min_nights)}`} className="group flex h-10 items-center justify-center" aria-label={`Add booking at ${p.name} from ${d}`}>
                          <Icon name="plus" className="h-3 w-3 text-ink-muted opacity-0 group-hover:opacity-100 group-focus:opacity-100" />
                        </Link>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-5 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-ink" /> Confirmed booking</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-amber-50 ring-1 ring-amber-700/30" /> Awaiting payment (held)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-[repeating-linear-gradient(45deg,#E9E0D2_0,#E9E0D2_3px,#F4EEE5_3px,#F4EEE5_6px)]" /> Blocked</span>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Block dates" description="Stop guests booking, e.g. for maintenance or personal use.">
          <form action={addBlock} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="_back" value={back} />
            <Field label="Property" name="block_property" className="sm:col-span-2">
              <select id="block_property" name="property_id" required className="input">
                {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="First night" name="start_date"><input id="start_date" type="date" name="start_date" required min={today} className="input" /></Field>
            <Field label="Last night" name="end_date"><input id="end_date" type="date" name="end_date" required min={today} className="input" /></Field>
            <Field label="Reason (private)" name="reason" className="sm:col-span-2"><input id="reason" name="reason" className="input" placeholder="e.g. Decorating" /></Field>
            <div className="sm:col-span-2"><SubmitButton className="btn-dark">Block dates</SubmitButton></div>
          </form>
        </Panel>
        <Panel title="Blocked this month">
          {blocks.length === 0 ? <p className="text-sm text-ink-muted">No blocked dates this month.</p> : (
            <ul className="divide-y divide-sand-200">
              {blocks.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    <span className="font-medium">{k.property_name}</span>
                    <span className="block text-xs text-ink-muted">Nights {formatDate(k.start_date, locale, { day: "numeric", month: "short" })} – {formatDate(addDays(k.end_date, -1), locale, { day: "numeric", month: "short" })}{k.reason ? ` · ${k.reason}` : ""}</span>
                  </span>
                  <form action={removeBlock.bind(null, k.id, back)}><SubmitButton className="btn-outline btn-sm" pendingLabel="…">Release</SubmitButton></form>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
