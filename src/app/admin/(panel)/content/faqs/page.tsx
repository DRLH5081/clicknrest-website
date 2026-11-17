import { listFaqs } from "@/lib/content";
import { PageHeader, Panel, Flash } from "@/components/admin/ui";
import { ContentNav } from "@/components/admin/ContentNav";
import { SubmitButton } from "@/components/SubmitButton";
import { saveFaq } from "../../../actions";

export const metadata = { title: "FAQs" };

export default async function FaqsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const faqs = listFaqs(false);
  return (
    <>
      <PageHeader title="Site content" description="Questions are grouped by category on the FAQs page, in the order set here." />
      <ContentNav current="faqs" />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="space-y-4">
        {faqs.map((f) => (
          <form key={f.id} action={saveFaq.bind(null, f.id)} className="card grid gap-3 p-5 md:grid-cols-[1fr_160px_90px]">
            <input name="question" defaultValue={f.question} aria-label="Question" className="input font-medium" />
            <input name="category" defaultValue={f.category} aria-label="Category" className="input" />
            <input type="number" name="sort_order" defaultValue={f.sort_order} aria-label="Order" className="input" />
            <textarea name="answer" defaultValue={f.answer} rows={2} aria-label="Answer" className="input md:col-span-3" />
            <div className="flex items-center gap-3 md:col-span-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={!!f.published} className="accent-gold-600" /> Published</label>
              <SubmitButton className="btn-outline btn-sm ml-auto" name="_action" value="save">Save</SubmitButton>
              <SubmitButton className="btn-ghost btn-sm text-danger-600" name="_action" value="delete" confirm="Delete this question?">Delete</SubmitButton>
            </div>
          </form>
        ))}
        <Panel title="Add a question">
          <form action={saveFaq.bind(null, null)} className="grid gap-3 md:grid-cols-[1fr_200px]">
            <input name="question" placeholder="Question" required aria-label="Question" className="input" />
            <input name="category" placeholder="Category, e.g. Booking" aria-label="Category" className="input" />
            <textarea name="answer" placeholder="Answer" required rows={3} aria-label="Answer" className="input md:col-span-2" />
            <input type="hidden" name="published" value="on" />
            <div><SubmitButton className="btn-dark">Add question</SubmitButton></div>
          </form>
        </Panel>
      </div>
    </>
  );
}
