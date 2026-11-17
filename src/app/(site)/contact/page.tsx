import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { listPublishedProperties } from "@/lib/properties";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Contact us", description: "Questions about a stay? Send us an enquiry and we'll get back to you." };

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const site = getSetting("site");
  const props = listPublishedProperties().map((p) => ({ slug: p.slug, name: p.name }));
  return (
    <div className="container-x pt-12 md:pt-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">We&apos;d love to hear from you</h1>
          <p className="mt-4 text-ink-soft">Ask about a home, check something before you book, or plan a longer stay. You&apos;ll hear back from the owner directly.</p>
          <ul className="mt-8 space-y-4">
            <li className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100"><Icon name="mail" className="h-4 w-4" /></span>
              <a href={`mailto:${site.contactEmail}`} className="hover:underline">{site.contactEmail}</a>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100"><Icon name="phone" className="h-4 w-4" /></span>
              <a href={`tel:${site.contactPhone.replace(/[^+\d]/g, "")}`} className="hover:underline">{site.contactPhone}</a>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100"><Icon name="clock" className="h-4 w-4" /></span>
              {site.contactHours}
            </li>
            {site.contactAddress && (
              <li className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100"><Icon name="pin" className="h-4 w-4" /></span>
                {site.contactAddress}
              </li>
            )}
          </ul>
        </div>
        <div className="card p-6 md:p-8">
          <EnquiryForm properties={props} defaultProperty={sp.property} />
        </div>
      </div>
    </div>
  );
}
