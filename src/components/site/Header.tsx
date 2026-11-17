import Link from "next/link";
import { Icon } from "../Icon";

const NAV = [
  { href: "/stays", label: "Stays" },
  { href: "/about", label: "About" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function Logo({ brand, tagline }: { brand: string; tagline?: string }) {
  // Colour the "N" gold, matching the Click'N'Rest wordmark (also handles "Click N Rest").
  const parts = brand.split(/(['’]N['’]| N )/);
  return (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-medium tracking-tight text-ink">
          {parts.map((part, i) =>
            i % 2 === 1 ? (
              <span key={i}>
                {part[0]}
                <span className="text-gold-500">N</span>
                {part[2]}
              </span>
            ) : (
              part
            ),
          )}
        </span>
        {tagline && <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-muted">{tagline}</span>}
      </span>
    </span>
  );
}

export function Header({ brand, tagline, demo }: { brand: string; tagline?: string; demo: boolean }) {
  return (
    <>
      {demo && (
        <div className="bg-ink text-center text-xs text-sand-100">
          <p className="container-x py-2">
            <strong className="font-semibold text-white">Demonstration website.</strong> Sample properties and content. Bookings and payments here are simulated and not real.
          </p>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-soft">
          Skip to content
        </a>
        <div className="container-x flex h-16 items-center justify-between gap-4 md:h-20">
          <Link href="/" className="rounded-lg" aria-label={`${brand} home`}>
            <Logo brand={brand} tagline={tagline} />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-sand-100 hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/booking/manage" className="btn-ghost">
              Manage booking
            </Link>
            <Link href="/stays" className="btn-primary">
              Book a stay
            </Link>
          </div>
          <details className="group relative md:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-sand-300 bg-white [&::-webkit-details-marker]:hidden" aria-label="Open menu">
              <Icon name="menu" className="h-5 w-5 group-open:hidden" />
              <Icon name="x" className="hidden h-5 w-5 group-open:block" />
            </summary>
            <nav aria-label="Mobile" className="absolute right-0 top-12 w-64 animate-fade-in rounded-2xl bg-white p-2 shadow-lift ring-1 ring-sand-200">
              {[...NAV, { href: "/booking/manage", label: "Manage booking" }].map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-sand-100">
                  {n.label}
                </Link>
              ))}
              <Link href="/stays" className="btn-primary mt-2 w-full">
                Book a stay
              </Link>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}
