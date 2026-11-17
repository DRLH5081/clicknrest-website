import { AMENITIES } from "@/lib/amenities";
import type { Property } from "@/lib/properties";
import { Panel, Field } from "./ui";
import { SubmitButton } from "../SubmitButton";

export function PropertyDetailsForm({ p, action }: { p?: Property; action: (fd: FormData) => Promise<void> }) {
  const groups = Array.from(new Set(AMENITIES.map((a) => a.group)));
  return (
    <form action={action} className="space-y-6">
      <Panel title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property name" name="name"><input id="name" name="name" required defaultValue={p?.name} className="input" /></Field>
          <Field label="Type" name="property_type" hint="e.g. Coastal cottage, City apartment"><input id="property_type" name="property_type" defaultValue={p?.property_type} className="input" /></Field>
          <Field label="Web address" name="slug" hint="Lowercase words and hyphens. Leave blank to generate from the name." className="sm:col-span-2">
            <div className="flex items-center rounded-xl border border-sand-300 bg-sand-50 pl-3.5 text-sm text-ink-muted focus-within:border-gold-600">
              /stays/<input id="slug" name="slug" defaultValue={p?.slug} className="w-full rounded-r-xl border-0 bg-white px-2 py-2.5 text-ink focus:outline-none" />
            </div>
          </Field>
          <Field label="Short summary" name="summary" hint="One or two sentences, shown at the top of the page and in search results." className="sm:col-span-2">
            <textarea id="summary" name="summary" rows={2} maxLength={400} defaultValue={p?.summary} className="input" />
          </Field>
          <Field label="Full description" name="description" hint="Separate paragraphs with a blank line. Use ## for a heading, - for a bullet, **bold**." className="sm:col-span-2">
            <textarea id="description" name="description" rows={9} defaultValue={p?.description} className="input font-mono text-[13px]" />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="featured" defaultChecked={!!p?.featured || !p} className="accent-gold-600" /> Feature on the homepage</label>
        </div>
      </Panel>

      <Panel title="Rooms & guests">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Max guests" name="max_guests"><input id="max_guests" type="number" min={1} name="max_guests" defaultValue={p?.max_guests ?? 2} className="input" /></Field>
          <Field label="Bedrooms" name="bedrooms"><input id="bedrooms" type="number" min={0} name="bedrooms" defaultValue={p?.bedrooms ?? 1} className="input" /></Field>
          <Field label="Beds" name="beds"><input id="beds" type="number" min={0} name="beds" defaultValue={p?.beds ?? 1} className="input" /></Field>
          <Field label="Bathrooms" name="bathrooms"><input id="bathrooms" type="number" min={0} step={0.5} name="bathrooms" defaultValue={p?.bathrooms ?? 1} className="input" /></Field>
        </div>
      </Panel>

      <Panel title="Amenities">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <fieldset key={g}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{g}</legend>
              <div className="space-y-2">
                {AMENITIES.filter((a) => a.group === g).map((a) => (
                  <label key={a.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="amenities" value={a.key} defaultChecked={p?.amenities.includes(a.key)} className="h-4 w-4 accent-gold-600" />
                    {a.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Panel>

      <Panel title="Arrival & house rules">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Check-in from" name="check_in_time"><input id="check_in_time" type="time" name="check_in_time" defaultValue={p?.check_in_time ?? "15:00"} className="input" /></Field>
          <Field label="Check-out by" name="check_out_time"><input id="check_out_time" type="time" name="check_out_time" defaultValue={p?.check_out_time ?? "10:00"} className="input" /></Field>
          <Field label="Check-in details" name="check_in_info" hint="Shown publicly. Don't include door codes here; send those to guests directly." className="sm:col-span-2">
            <textarea id="check_in_info" name="check_in_info" rows={3} defaultValue={p?.check_in_info} className="input" />
          </Field>
          <Field label="House rules" name="house_rules" hint="One rule per line." className="sm:col-span-2">
            <textarea id="house_rules" name="house_rules" rows={5} defaultValue={p?.house_rules} className="input" />
          </Field>
        </div>
      </Panel>

      <Panel title="Location" description="Only the general area is shown on the map; the exact address is never published.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Town" name="town"><input id="town" name="town" required defaultValue={p?.town} className="input" /></Field>
          <Field label="Region" name="region" hint="Used for the location filter"><input id="region" name="region" required defaultValue={p?.region} className="input" /></Field>
          <Field label="Latitude" name="latitude" hint="Approximate, e.g. 50.21"><input id="latitude" name="latitude" inputMode="decimal" defaultValue={p?.latitude ?? ""} className="input" /></Field>
          <Field label="Longitude" name="longitude" hint="Approximate, e.g. -5.48"><input id="longitude" name="longitude" inputMode="decimal" defaultValue={p?.longitude ?? ""} className="input" /></Field>
          <Field label="About the area" name="area_info" className="sm:col-span-2"><textarea id="area_info" name="area_info" rows={4} defaultValue={p?.area_info} className="input" /></Field>
        </div>
      </Panel>

      <Panel title="Search engines" description="Optional. Leave blank to use the name and summary.">
        <div className="grid gap-4">
          <Field label="Page title" name="meta_title" hint="Around 50–60 characters"><input id="meta_title" name="meta_title" maxLength={120} defaultValue={p?.meta_title} className="input" /></Field>
          <Field label="Meta description" name="meta_description" hint="Around 150 characters"><textarea id="meta_description" name="meta_description" rows={2} maxLength={300} defaultValue={p?.meta_description} className="input" /></Field>
        </div>
      </Panel>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <SubmitButton className="btn-primary shadow-lift" pendingLabel="Saving…">{p ? "Save changes" : "Create property"}</SubmitButton>
      </div>
    </form>
  );
}
