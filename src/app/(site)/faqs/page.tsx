import type { Metadata } from "next";
import Link from "next/link";
import { listFaqs } from "@/lib/content";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Frequently asked questions", description: "Answers to common questions about booking, payment, cancellations and your stay." };

export default function FaqsPage() {
  const faqs = listFaqs();
  const groups = Array.from(new Set(faqs.map((f) => f.category)));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <div className="container-x max-w-3xl pt-12 md:pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="eyebrow">Help</p>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">Frequently asked questions</h1>
      <p className="mt-3 text-ink-soft">
        Can&apos;t find what you need?{" "}
        <Link href="/contact" className="font-semibold text-ink underline">
          Get in touch
        </Link>
        .
      </p>
      {groups.map((g) => (
        <section key={g} className="mt-10" aria-labelledby={`faq-${g}`}>
          <h2 id={`faq-${g}`} className="mb-3 font-display text-2xl">
            {g}
          </h2>
          <div className="divide-y divide-sand-200 rounded-3xl bg-white ring-1 ring-sand-200">
            {faqs
              .filter((f) => f.category === g)
              .map((f) => (
                <details key={f.id} className="group px-6 py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <Icon name="plus" className="h-5 w-5 shrink-0 text-ink-muted transition group-open:rotate-45" />
                  </summary>
                  <p className="pb-5 leading-relaxed text-ink-soft">{f.answer}</p>
                </details>
              ))}
          </div>
        </section>
      ))}
      {faqs.length === 0 && <p className="mt-10 text-ink-soft">No questions published yet.</p>}
    </div>
  );
}
