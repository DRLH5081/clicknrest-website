import Link from "next/link";
import type { SiteSettings } from "@/lib/settings";
import { Logo } from "./Header";

export function Footer({ site }: { site: SiteSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-sand-200 bg-sand-50">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo brand={site.brandName} tagline={site.tagline} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">Self-catering apartments across north and west London, looked after by us and booked directly with no platform fees.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
            <li><Link className="hover:text-ink hover:underline" href="/stays">All stays</Link></li>
            <li><Link className="hover:text-ink hover:underline" href="/about">About us</Link></li>
            <li><Link className="hover:text-ink hover:underline" href="/faqs">FAQs</Link></li>
            <li><Link className="hover:text-ink hover:underline" href="/booking/manage">Manage booking</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Get in touch</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
            <li><a className="hover:text-ink hover:underline" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></li>
            <li><a className="hover:text-ink hover:underline" href={`tel:${site.contactPhone.replace(/[^+\d]/g, "")}`}>{site.contactPhone}</a></li>
            <li>{site.contactHours}</li>
            <li><Link className="hover:text-ink hover:underline" href="/contact">Send an enquiry</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sand-200">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>© {year} {site.brandName}{site.companyName ? ` is a trading name of ${site.companyName}` : ""}.</p>
            {site.companyName && (
              <p>
                Registered in England and Wales{site.companyNumber ? `, company number ${site.companyNumber}` : ""}.
                {site.registeredOffice ? ` Registered office: ${site.registeredOffice}.` : ""}
              </p>
            )}
          </div>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className="hover:text-ink hover:underline" href="/legal/privacy">Privacy policy</Link>
            <Link className="hover:text-ink hover:underline" href="/legal/terms">Booking terms</Link>
            <Link className="hover:text-ink hover:underline" href="/legal/cancellation">Cancellation policy</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
