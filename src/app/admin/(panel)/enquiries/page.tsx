import { getDb } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { setEnquiryStatus } from "../../actions";

export const metadata = { title: "Enquiries" };

export default function EnquiriesPage() {
  const { locale, timeZone } = getSetting("regional");
  const rows = getDb()
    .prepare("SELECT e.*, p.name AS property_name FROM enquiries e LEFT JOIN properties p ON p.id = e.property_id ORDER BY e.status = 'closed', e.created_at DESC LIMIT 200")
    .all() as { id: number; name: string; email: string; phone: string; property_name: string | null; dates: string; message: string; status: string; created_at: string }[];
  const dt = (s: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z"));
  return (
    <>
      <PageHeader title="Enquiries" description="Messages sent from the contact form. Reply by email, then mark them as replied." />
      <ul className="space-y-4">
        {rows.map((e) => (
          <li key={e.id} className={`card p-5 ${e.status === "closed" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{e.name} <StatusBadge status={e.status} /></p>
                <p className="text-xs text-ink-muted">{dt(e.created_at)} · <a className="underline" href={`mailto:${e.email}?subject=${encodeURIComponent("Re: your enquiry")}`}>{e.email}</a>{e.phone ? ` · ${e.phone}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <a className="btn-dark btn-sm" href={`mailto:${e.email}?subject=${encodeURIComponent("Re: your enquiry")}`}>Reply by email</a>
                {e.status !== "replied" && <form action={setEnquiryStatus.bind(null, e.id, "replied")}><SubmitButton className="btn-outline btn-sm" pendingLabel="…">Mark replied</SubmitButton></form>}
                {e.status !== "closed" && <form action={setEnquiryStatus.bind(null, e.id, "closed")}><SubmitButton className="btn-ghost btn-sm" pendingLabel="…">Close</SubmitButton></form>}
              </div>
            </div>
            {(e.property_name || e.dates) && <p className="mt-3 text-sm text-ink-soft">{e.property_name && <>Property: <strong>{e.property_name}</strong>. </>}{e.dates && <>Dates: <strong>{e.dates}</strong></>}</p>}
            <p className="mt-2 whitespace-pre-line text-sm">{e.message}</p>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="card p-10 text-center text-sm text-ink-muted">No enquiries yet.</p>}
    </>
  );
}
