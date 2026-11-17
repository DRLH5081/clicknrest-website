import Link from "next/link";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/content";
import { PageHeader, Panel, Field, Flash } from "@/components/admin/ui";
import { ContentNav } from "@/components/admin/ContentNav";
import { SubmitButton } from "@/components/SubmitButton";
import { savePage } from "../../../../actions";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = getPage(slug);
  if (!page) notFound();
  const href = slug === "about" ? "/about" : `/legal/${slug}`;
  return (
    <>
      <PageHeader title="Site content" />
      <ContentNav current={slug} />
      <Flash ok={sp.ok} error={sp.error} />
      <form action={savePage.bind(null, slug)} className="space-y-6">
        <Panel title={page.title} description={`Public page: ${href}`}>
          <div className="grid gap-4">
            <Field label="Page title" name="title"><input id="title" name="title" defaultValue={page.title} className="input" /></Field>
            <Field label="Content" name="body" hint="Blank line between paragraphs. ## Heading, - bullet, **bold**, [link text](https://…)">
              <textarea id="body" name="body" rows={20} defaultValue={page.body} className="input font-mono text-[13px]" />
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_draft_content" defaultChecked={!!page.is_draft_content} className="accent-gold-600" /> Show “Draft for review” label on the page</label>
          </div>
        </Panel>
        <Panel title="Search engines">
          <div className="grid gap-4">
            <Field label="Page title for search results" name="meta_title"><input id="meta_title" name="meta_title" defaultValue={page.meta_title} className="input" /></Field>
            <Field label="Meta description" name="meta_description"><textarea id="meta_description" name="meta_description" rows={2} defaultValue={page.meta_description} className="input" /></Field>
          </div>
        </Panel>
        <div className="flex items-center justify-end gap-3">
          <Link href={href} target="_blank" className="btn-ghost">View page</Link>
          <SubmitButton className="btn-primary" pendingLabel="Saving…">Save page</SubmitButton>
        </div>
      </form>
    </>
  );
}
