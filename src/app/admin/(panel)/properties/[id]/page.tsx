import Link from "next/link";
import { notFound } from "next/navigation";
import { getPropertyById } from "@/lib/properties";
import { getSetting } from "@/lib/settings";
import { formatDate } from "@/lib/dates";
import { formatMoney, minorToInput } from "@/lib/format";
import { PageHeader, Panel, Field, Flash, StatusBadge } from "@/components/admin/ui";
import { PropertyDetailsForm } from "@/components/admin/PropertyDetailsForm";
import { Picture } from "@/components/Picture";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon } from "@/components/Icon";
import { saveProperty, setPropertyStatus, savePricing, saveSeason, deleteSeason, uploadPhotos, updatePhoto } from "../../../actions";

export const metadata = { title: "Edit property" };

const TABS = [
  { key: "details", label: "Details & content" },
  { key: "photos", label: "Photos" },
  { key: "pricing", label: "Prices & stays" },
];

export default async function EditPropertyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const p = getPropertyById(Number(id));
  if (!p) notFound();
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "details";
  const { currency, locale } = getSetting("regional");
  const fmt = (n: number) => formatMoney(n, currency, locale);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/properties", label: "Properties" }}
        title={p.name}
        description={`/stays/${p.slug}`}
        actions={
          <>
            <StatusBadge status={p.status} />
            {p.status === "published" && <Link href={`/stays/${p.slug}`} target="_blank" className="btn-outline btn-sm"><Icon name="external" className="h-3.5 w-3.5" /> View live</Link>}
            {p.status !== "published" && <form action={setPropertyStatus.bind(null, p.id, "published")}><SubmitButton className="btn-primary btn-sm" pendingLabel="Publishing…">Publish</SubmitButton></form>}
            {p.status === "published" && <form action={setPropertyStatus.bind(null, p.id, "draft")}><SubmitButton className="btn-outline btn-sm" confirm="Hide this property from the website?">Unpublish</SubmitButton></form>}
            {p.status !== "archived" && <form action={setPropertyStatus.bind(null, p.id, "archived")}><SubmitButton className="btn-ghost btn-sm" confirm="Archive this property? It will be hidden from the website and admin lists; bookings are kept.">Archive</SubmitButton></form>}
          </>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />
      {p.is_demo ? <p className="mb-6 rounded-xl bg-sand-50 p-3 text-xs text-ink-muted ring-1 ring-sand-200">This is a demonstration property with placeholder text, prices and illustrations. Replace the content below, or archive it.</p> : null}
      <nav className="mb-6 flex gap-1 border-b border-sand-200" aria-label="Property sections">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/properties/${p.id}?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${tab === t.key ? "border-gold-600 text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "details" && <PropertyDetailsForm p={p} action={saveProperty.bind(null, p.id)} />}

      {tab === "photos" && (
        <div className="space-y-6">
          <Panel title="Upload photos" description="JPEG, PNG, WebP or AVIF up to 15 MB each. They're resized and compressed automatically. The first photo is the cover image.">
            <form action={uploadPhotos.bind(null, p.id)} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/avif" multiple required className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
              <SubmitButton className="btn-primary shrink-0" pendingLabel="Uploading…"><Icon name="upload" className="h-4 w-4" /> Upload</SubmitButton>
            </form>
          </Panel>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {p.images.map((img, i) => {
              const act = updatePhoto.bind(null, p.id, img.id);
              return (
                <li key={img.id} className="card overflow-hidden">
                  <div className="relative aspect-[3/2]">
                    <Picture mediaKey={img.media_key} alt={img.alt} sizes="400px" className="h-full w-full" />
                    {i === 0 && <span className="badge absolute left-3 top-3 bg-white text-ink shadow-soft">Cover</span>}
                  </div>
                  <form action={act} className="space-y-3 p-4">
                    <label className="block text-xs font-medium text-ink-muted" htmlFor={`alt-${img.id}`}>Description (for screen readers)</label>
                    <input id={`alt-${img.id}`} name="alt" defaultValue={img.alt} className="input" />
                    <div className="flex flex-wrap gap-1.5">
                      <SubmitButton className="btn-outline btn-sm" name="_action" value="alt">Save</SubmitButton>
                      {i > 0 && <SubmitButton className="btn-ghost btn-sm" name="_action" value="cover" pendingLabel="…">Make cover</SubmitButton>}
                      {i > 0 && <SubmitButton className="btn-ghost btn-sm" name="_action" value="up" pendingLabel="…"><Icon name="chevronLeft" className="h-3.5 w-3.5" /><span className="sr-only">Move earlier</span></SubmitButton>}
                      {i < p.images.length - 1 && <SubmitButton className="btn-ghost btn-sm" name="_action" value="down" pendingLabel="…"><Icon name="chevronRight" className="h-3.5 w-3.5" /><span className="sr-only">Move later</span></SubmitButton>}
                      <SubmitButton className="btn-ghost btn-sm ml-auto text-danger-600" name="_action" value="delete" pendingLabel="…" confirm="Delete this photo?"><Icon name="trash" className="h-3.5 w-3.5" /><span className="sr-only">Delete</span></SubmitButton>
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
          {p.images.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-sm text-ink-muted ring-1 ring-sand-200">No photos yet. Upload at least one to publish this property.</p>}
        </div>
      )}

      {tab === "pricing" && (
        <div className="space-y-6">
          <Panel title="Standard prices" description={`Amounts in ${currency}. Seasonal prices below override these for their dates.`}>
            <form action={savePricing.bind(null, p.id)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Nightly rate" name="base_rate"><input id="base_rate" name="base_rate" inputMode="decimal" required defaultValue={minorToInput(p.base_rate)} className="input" /></Field>
              <Field label="Fri & Sat rate" name="weekend_rate" hint="Optional"><input id="weekend_rate" name="weekend_rate" inputMode="decimal" defaultValue={minorToInput(p.weekend_rate)} className="input" /></Field>
              <Field label="Cleaning fee" name="cleaning_fee" hint="Per stay"><input id="cleaning_fee" name="cleaning_fee" inputMode="decimal" defaultValue={minorToInput(p.cleaning_fee)} className="input" /></Field>
              <Field label="Minimum nights" name="min_nights"><input id="min_nights" type="number" min={1} name="min_nights" defaultValue={p.min_nights} className="input" /></Field>
              <Field label="Maximum nights" name="max_nights"><input id="max_nights" type="number" min={1} name="max_nights" defaultValue={p.max_nights} className="input" /></Field>
              <div className="sm:col-span-2 lg:col-span-5"><SubmitButton className="btn-primary">Save prices</SubmitButton></div>
            </form>
          </Panel>

          <Panel title="Seasonal prices" description="Set a different nightly rate and minimum stay for date ranges. The minimum stay is based on the check-in night. Where seasons overlap, the one that starts later wins.">
            <div className="-mx-6 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-wider text-ink-muted">
                    <th className="px-6 py-2 font-medium">Name</th><th className="px-2 py-2 font-medium">First night</th><th className="px-2 py-2 font-medium">Last night</th><th className="px-2 py-2 font-medium">Nightly rate</th><th className="px-2 py-2 font-medium">Min nights</th><th className="px-6 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {p.seasons.map((s) => (
                    <tr key={s.id}>
                      <td colSpan={6} className="p-0">
                        <form action={saveSeason.bind(null, p.id, s.id)} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_0.6fr_auto] items-center gap-2 px-6 py-2">
                          <input name="name" defaultValue={s.name} aria-label="Season name" className="input" />
                          <input type="date" name="start_date" defaultValue={s.start_date} aria-label="First night" className="input" />
                          <input type="date" name="end_date" defaultValue={s.end_date} aria-label="Last night" className="input" />
                          <input name="nightly_rate" inputMode="decimal" defaultValue={minorToInput(s.nightly_rate)} aria-label="Nightly rate" className="input" />
                          <input type="number" min={1} name="min_nights" defaultValue={s.min_nights ?? ""} placeholder={String(p.min_nights)} aria-label="Minimum nights" className="input" />
                          <div className="flex gap-1">
                            <SubmitButton className="btn-outline btn-sm" pendingLabel="…">Save</SubmitButton>
                            <SubmitButton className="btn-ghost btn-sm text-danger-600" pendingLabel="…" formAction={deleteSeason.bind(null, p.id, s.id)} confirm={`Delete season “${s.name}”?`}><span className="sr-only">Delete</span><Icon name="trash" className="h-3.5 w-3.5" /></SubmitButton>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {p.seasons.length > 0 && <p className="mt-2 text-xs text-ink-muted">Shown: {p.seasons.length} seasons from {formatDate(p.seasons[0].start_date, locale)}. Example: {p.seasons[0].name} at {fmt(p.seasons[0].nightly_rate)}/night.</p>}
            <form action={saveSeason.bind(null, p.id, null)} className="mt-6 grid gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.6fr_auto] lg:items-end">
              <Field label="New season" name="new_name"><input id="new_name" name="name" placeholder="e.g. Easter" required className="input" /></Field>
              <Field label="First night" name="new_start"><input id="new_start" type="date" name="start_date" required className="input" /></Field>
              <Field label="Last night" name="new_end"><input id="new_end" type="date" name="end_date" required className="input" /></Field>
              <Field label="Nightly rate" name="new_rate"><input id="new_rate" name="nightly_rate" inputMode="decimal" required className="input" /></Field>
              <Field label="Min nights" name="new_min"><input id="new_min" type="number" min={1} name="min_nights" className="input" /></Field>
              <SubmitButton className="btn-dark">Add</SubmitButton>
            </form>
          </Panel>
        </div>
      )}
    </>
  );
}
