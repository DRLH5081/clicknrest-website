import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { emailMode } from "@/lib/email";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Email log" };

type Email = { id: number; to_address: string; subject: string; text_body: string; html_body: string; transport: string; status: string; error: string; created_at: string };

export default async function EmailsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { locale, timeZone } = getSetting("regional");
  const db = getDb();
  const rows = db.prepare("SELECT id, to_address, subject, transport, status, error, created_at FROM email_outbox ORDER BY id DESC LIMIT 100").all() as Email[];
  const selected = sp.id ? (db.prepare("SELECT * FROM email_outbox WHERE id = ?").get(Number(sp.id)) as Email | undefined) : rows[0] ? (db.prepare("SELECT * FROM email_outbox WHERE id = ?").get(rows[0].id) as Email) : undefined;
  const dt = (s: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z"));
  const demo = emailMode() === "demo";
  return (
    <>
      <PageHeader title="Email log" description={demo ? "Demo mode: no email server is connected, so messages are recorded here instead of being sent." : "Every email the website has sent to guests and to you."} />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <ul className="card divide-y divide-sand-200 overflow-hidden">
          {rows.map((e) => (
            <li key={e.id}>
              <Link href={`/admin/emails?id=${e.id}`} aria-current={selected?.id === e.id ? "true" : undefined} className={`block px-4 py-3 text-sm hover:bg-sand-50 ${selected?.id === e.id ? "bg-sand-100" : ""}`}>
                <span className="block truncate font-medium">{e.subject}</span>
                <span className="block truncate text-xs text-ink-muted">To {e.to_address} · {dt(e.created_at)} · {e.status === "logged_demo" ? "not sent (demo)" : e.status}</span>
              </Link>
            </li>
          ))}
          {rows.length === 0 && <li className="p-8 text-center text-sm text-ink-muted">No emails yet. Make a booking on the website to see confirmations here.</li>}
        </ul>
        {selected && (
          <div className="card overflow-hidden">
            <div className="border-b border-sand-200 p-4 text-sm">
              <p className="font-medium">{selected.subject}</p>
              <p className="text-xs text-ink-muted">To {selected.to_address} · {dt(selected.created_at)} · via {selected.transport}{selected.error ? ` · error: ${selected.error}` : ""}</p>
            </div>
            <iframe title="Email preview" sandbox="" srcDoc={selected.html_body} className="h-[640px] w-full bg-canvas" />
          </div>
        )}
      </div>
    </>
  );
}
