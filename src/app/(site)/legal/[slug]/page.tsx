import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/content";
import { Markdown } from "@/components/Markdown";
import { formatDate } from "@/lib/dates";
import { getSetting } from "@/lib/settings";

const LEGAL = ["privacy", "terms", "cancellation"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = LEGAL.includes(slug) ? getPage(slug) : null;
  return page ? { title: page.meta_title || page.title, description: page.meta_description } : { title: "Not found" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = LEGAL.includes(slug) ? getPage(slug) : null;
  if (!page) notFound();
  return (
    <article className="container-x max-w-3xl pt-12 md:pt-16">
      {page.is_draft_content ? (
        <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Draft for review · placeholder wording</p>
      ) : null}
      <h1 className="font-display text-4xl md:text-5xl">{page.title}</h1>
      <p className="mt-3 text-sm text-ink-muted">Last updated {formatDate(page.updated_at.slice(0, 10), getSetting("regional").locale, { day: "numeric", month: "long", year: "numeric" })}</p>
      <Markdown source={page.body} className="prose-lite mt-8" />
    </article>
  );
}
