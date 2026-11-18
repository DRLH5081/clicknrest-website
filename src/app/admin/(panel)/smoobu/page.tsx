import { listAllProperties } from "@/lib/properties";
import { getDb } from "@/lib/db";
import { getSyncStatus, listApartments, smoobuEnabled, type SmoobuApartment } from "@/lib/smoobu";
import { getSetting } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { todayIn } from "@/lib/dates";
import { PageHeader, Panel, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon } from "@/components/Icon";
import { saveSmoobuLinks, syncSmoobuNow } from "../../actions";

export const metadata = { title: "Smoobu sync" };
export const dynamic = "force-dynamic";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" }) : "never");

export default async function SmoobuPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const enabled = smoobuEnabled();
  const status = getSyncStatus();
  const props = listAllProperties(false);
  const { currency, locale, timeZone } = getSetting("regional");
  const today = todayIn(timeZone);

  let apartments: SmoobuApartment[] = [];
  let listError = "";
  if (enabled) {
    try {
      apartments = await listApartments();
    } catch (e) {
      listError = e instanceof Error ? e.message : String(e);
    }
  }
  const nextPrice = getDb().prepare(
    "SELECT price, min_stay, available FROM smoobu_nights WHERE property_id = ? AND night = ?",
  ) as { get(id: number, night: string): { price: number | null; min_stay: number | null; available: number } | undefined };

  return (
    <>
      <PageHeader
        title="Smoobu sync"
        description="Prices, minimum stays and availability come from Smoobu (and PriceLabs through it). Paid website bookings are sent back to Smoobu so the dates close on Airbnb."
        actions={
          enabled ? (
            <form action={syncSmoobuNow}>
              <SubmitButton className="btn-outline btn-sm" pendingLabel="Syncing…">Sync now</SubmitButton>
            </form>
          ) : null
        }
      />
      <Flash ok={sp.ok} error={sp.error} />

      {!enabled ? (
        <Panel title="Not connected yet">
          <div className="space-y-3 text-sm text-ink-soft">
            <p>Until Smoobu is connected, the website uses the prices and minimum stays set on each property.</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>In Smoobu, open Settings, then Advanced, then API Keys. Click Create API Key, then Generate Secret.</li>
              <li>In Render, open your service, then Environment, and add <code className="rounded bg-sand-100 px-1">SMOOBU_API_KEY</code> and <code className="rounded bg-sand-100 px-1">SMOOBU_API_SECRET</code>.</li>
              <li>Save and redeploy, then come back here to link each apartment.</li>
            </ol>
          </div>
        </Panel>
      ) : (
        <div className="space-y-6">
          <Panel title="Status">
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-ink-muted">Last successful sync</dt><dd className="font-medium">{when(status.lastSuccessAt)}</dd></div>
              <div><dt className="text-ink-muted">Linked apartments</dt><dd className="font-medium">{props.filter((p) => p.smoobu_apartment_id).length} of {props.length}</dd></div>
              <div><dt className="text-ink-muted">Updates</dt><dd className="font-medium">Every 10 minutes, and again just before each booking</dd></div>
            </dl>
            {status.error && <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /> Last sync failed: {status.error}</p>}
            {listError && <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /> Couldn&apos;t load your Smoobu listings: {listError}</p>}
          </Panel>

          <form action={saveSmoobuLinks}>
            <Panel title="Link each apartment to its Smoobu listing" description="Only linked apartments use Smoobu prices and availability. Leave one unlinked to keep using its dashboard prices.">
              <div className="divide-y divide-sand-200">
                {props.map((p) => {
                  const t = nextPrice.get(p.id, today);
                  return (
                    <div key={p.id} className="grid items-center gap-2 py-3 sm:grid-cols-[1fr_minmax(0,18rem)_10rem]">
                      <label htmlFor={`apt_${p.id}`} className="font-medium">{p.name}</label>
                      <select id={`apt_${p.id}`} name={`apt_${p.id}`} defaultValue={p.smoobu_apartment_id ? String(p.smoobu_apartment_id) : ""} className="input">
                        <option value="">Not linked</option>
                        {apartments.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} (#{a.id})</option>
                        ))}
                        {p.smoobu_apartment_id && !apartments.some((a) => a.id === p.smoobu_apartment_id) && (
                          <option value={p.smoobu_apartment_id}>#{p.smoobu_apartment_id}</option>
                        )}
                      </select>
                      <span className="text-xs text-ink-muted">
                        {p.smoobu_apartment_id && t
                          ? t.available && t.price
                            ? `Tonight ${formatMoney(t.price, currency, locale)}${t.min_stay ? `, min ${t.min_stay}` : ""}`
                            : "Tonight unavailable"
                          : p.smoobu_apartment_id
                            ? "Waiting for sync"
                            : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4"><SubmitButton className="btn-primary" pendingLabel="Saving and syncing…">Save links and sync</SubmitButton></div>
            </Panel>
          </form>
        </div>
      )}
    </>
  );
}
