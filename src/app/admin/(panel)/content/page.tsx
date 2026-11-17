import { getSetting } from "@/lib/settings";
import { PageHeader, Panel, Field, Flash } from "@/components/admin/ui";
import { ContentNav } from "@/components/admin/ContentNav";
import { Picture } from "@/components/Picture";
import { SubmitButton } from "@/components/SubmitButton";
import { saveHome } from "../../actions";

export const metadata = { title: "Site content" };

function ImageField({ label, name, current }: { label: string; name: string; current: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-200"><Picture mediaKey={current} alt="" sizes="96px" className="h-full w-full" /></div>
      <label className="text-sm">
        <span className="label">{label}</span>
        <input type="file" name={name} accept="image/*" className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-sand-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold" />
      </label>
    </div>
  );
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const h = getSetting("home");
  const benefits = [0, 1, 2, 3].map((i) => h.benefits[i] ?? { title: "", body: "" });
  const exps = [0, 1, 2].map((i) => h.experiences[i] ?? { title: "", body: "", image: "" });
  return (
    <>
      <PageHeader title="Site content" description="Edit the words and images on your website. Brand name and contact details are in Settings." />
      <ContentNav current="home" />
      <Flash ok={sp.ok} error={sp.error} />
      <form action={saveHome} className="space-y-6">
        <Panel title="Hero">
          <div className="grid gap-4">
            <Field label="Small heading above the headline" name="heroEyebrow"><input id="heroEyebrow" name="heroEyebrow" defaultValue={h.heroEyebrow} className="input" /></Field>
            <Field label="Headline" name="heroHeadline"><input id="heroHeadline" name="heroHeadline" defaultValue={h.heroHeadline} className="input" /></Field>
            <Field label="Introduction" name="heroIntro"><textarea id="heroIntro" name="heroIntro" rows={2} defaultValue={h.heroIntro} className="input" /></Field>
            <ImageField label="Replace hero image (wide landscape works best)" name="heroImageFile" current={h.heroImage} />
          </div>
        </Panel>
        <Panel title="Brand introduction">
          <div className="grid gap-4">
            <Field label="Title" name="introTitle"><input id="introTitle" name="introTitle" defaultValue={h.introTitle} className="input" /></Field>
            <Field label="Text" name="introBody"><textarea id="introBody" name="introBody" rows={4} defaultValue={h.introBody} className="input" /></Field>
            <ImageField label="Replace image (also used on the About page)" name="introImageFile" current={h.introImage} />
          </div>
        </Panel>
        <Panel title="Why book direct" description="Up to four short benefits. Leave a title blank to hide it.">
          <Field label="Section title" name="benefitsTitle" className="mb-4"><input id="benefitsTitle" name="benefitsTitle" defaultValue={h.benefitsTitle} className="input" /></Field>
          <div className="grid gap-4 md:grid-cols-2">
            {benefits.map((b, i) => (
              <div key={i} className="space-y-2 rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
                <input name={`benefit${i}Title`} defaultValue={b.title} placeholder="Title" aria-label={`Benefit ${i + 1} title`} className="input" />
                <textarea name={`benefit${i}Body`} defaultValue={b.body} rows={2} placeholder="Text" aria-label={`Benefit ${i + 1} text`} className="input" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Local experiences" description="Up to three. Leave a title blank to hide it.">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <Field label="Section title" name="experiencesTitle"><input id="experiencesTitle" name="experiencesTitle" defaultValue={h.experiencesTitle} className="input" /></Field>
            <Field label="Introduction" name="experiencesIntro"><input id="experiencesIntro" name="experiencesIntro" defaultValue={h.experiencesIntro} className="input" /></Field>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {exps.map((x, i) => (
              <div key={i} className="space-y-2 rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
                <input name={`exp${i}Title`} defaultValue={x.title} placeholder="Title" aria-label={`Experience ${i + 1} title`} className="input" />
                <textarea name={`exp${i}Body`} defaultValue={x.body} rows={2} placeholder="Text" aria-label={`Experience ${i + 1} text`} className="input" />
                <ImageField label="Image" name={`exp${i}ImageFile`} current={x.image} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Closing call to action">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title" name="ctaTitle"><input id="ctaTitle" name="ctaTitle" defaultValue={h.ctaTitle} className="input" /></Field>
            <Field label="Text" name="ctaBody"><input id="ctaBody" name="ctaBody" defaultValue={h.ctaBody} className="input" /></Field>
          </div>
        </Panel>
        <div className="sticky bottom-4 z-10 flex justify-end"><SubmitButton className="btn-primary shadow-lift" pendingLabel="Saving…">Save homepage</SubmitButton></div>
      </form>
    </>
  );
}
