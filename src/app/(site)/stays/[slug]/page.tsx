import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPropertyBySlug, fromPrice, houseRulesList } from "@/lib/properties";
import { getSetting } from "@/lib/settings";
import { isIsoDate, todayIn } from "@/lib/dates";
import { AMENITIES } from "@/lib/amenities";
import { Gallery } from "@/components/site/Gallery";
import { Markdown } from "@/components/Markdown";
import { Icon, AMENITY_ICONS } from "@/components/Icon";
import { AvailabilityCalendar, BookingPanel, BookingProvider, MobileBookingBar } from "@/components/site/BookingWidget";

type Params = { slug: string };
type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getPropertyBySlug(slug, { publishedOnly: true });
  if (!p) return { title: "Stay not found" };
  return {
    title: p.meta_title || `${p.name}, ${p.town}`,
    description: p.meta_description || p.summary,
    alternates: { canonical: `/stays/${p.slug}` },
    openGraph: { title: p.meta_title || p.name, description: p.meta_description || p.summary, images: p.images[0] ? [`/media/${p.images[0].media_key}/md`] : [] },
  };
}

function formatTime(t: string, locale: string) {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: m ? "2-digit" : undefined, timeZone: "UTC" }).format(new Date(Date.UTC(2020, 0, 1, h, m || 0)));
}

export default async function PropertyPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = getPropertyBySlug(slug, { publishedOnly: true });
  if (!p) notFound();
  const { currency, locale, timeZone } = getSetting("regional");
  const policy = getSetting("booking");
  const today = todayIn(timeZone);
  const from = fromPrice(p, today);
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const initial = {
    checkIn: isIsoDate(s("checkIn")) ? s("checkIn") : undefined,
    checkOut: isIsoDate(s("checkOut")) ? s("checkOut") : undefined,
    guests: Number(s("guests")) || undefined,
  };
  const amenities = AMENITIES.filter((a) => p.amenities.includes(a.key));
  const rules = houseRulesList(p);
  const hasMap = p.latitude != null && p.longitude != null;
  // Approximate location only: a wide box with no exact pin.
  const bbox = hasMap ? [p.longitude! - 0.06, p.latitude! - 0.035, p.longitude! + 0.06, p.latitude! + 0.035].map((n) => n.toFixed(4)).join(",") : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: p.name,
    description: p.summary,
    address: { "@type": "PostalAddress", addressLocality: p.town, addressRegion: p.region },
    containsPlace: { "@type": "Accommodation", numberOfBedrooms: p.bedrooms, occupancy: { "@type": "QuantitativeValue", maxValue: p.max_guests } },
  };

  const facts = [
    { icon: "users", label: `${p.max_guests} guests` },
    { icon: "door", label: `${p.bedrooms} ${p.bedrooms === 1 ? "bedroom" : "bedrooms"}` },
    { icon: "bed", label: `${p.beds} ${p.beds === 1 ? "bed" : "beds"}` },
    { icon: "bath", label: `${p.bathrooms} ${p.bathrooms === 1 ? "bathroom" : "bathrooms"}` },
  ];

  return (
    <BookingProvider slug={p.slug} locale={locale} currency={currency} maxGuests={p.max_guests} initial={initial}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-x pb-28 pt-6 md:pt-10 lg:pb-0">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/stays" className="hover:text-ink hover:underline">
                All stays
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>{p.town}</li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {p.name}
            </li>
          </ol>
        </nav>

        <header className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">{p.property_type}</p>
            <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{p.name}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-ink-soft">
              <Icon name="pin" className="h-4 w-4" />
              {p.town}, {p.region}
            </p>
          </div>
        </header>

        <Gallery images={p.images} name={p.name} />

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
          <div className="min-w-0 space-y-12">
            <section aria-label="Key details">
              <ul className="flex flex-wrap gap-2.5">
                {facts.map((f) => (
                  <li key={f.label} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm ring-1 ring-sand-200">
                    <Icon name={f.icon} className="h-4 w-4 text-gold-600" />
                    {f.label}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-lg leading-relaxed text-ink">{p.summary}</p>
            </section>

            <section aria-labelledby="about-home">
              <h2 id="about-home" className="font-display text-2xl">
                About this home
              </h2>
              <Markdown source={p.description} className="prose-lite mt-4" />
            </section>

            <section aria-labelledby="amenities">
              <h2 id="amenities" className="font-display text-2xl">
                What this home offers
              </h2>
              <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {amenities.map((a) => (
                  <li key={a.key} className="flex items-center gap-3 text-ink-soft">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand-100 text-ink">
                      <Icon name={AMENITY_ICONS[a.key] ?? "check"} className="h-4 w-4" />
                    </span>
                    {a.label}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="availability" className="card p-6 md:p-8">
              <h2 id="availability" className="font-display text-2xl">
                Availability
              </h2>
              <p className="mb-6 mt-1 text-sm text-ink-soft">Select your check-in and check-out dates. Prices update live in the booking panel.</p>
              <AvailabilityCalendar />
            </section>

            <section aria-labelledby="good-to-know">
              <h2 id="good-to-know" className="font-display text-2xl">
                Good to know
              </h2>
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <div className="card p-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Icon name="clock" className="h-4 w-4 text-gold-600" /> Check-in &amp; check-out
                  </h3>
                  <p className="mt-3 text-sm text-ink-soft">
                    Check-in from <strong className="text-ink">{formatTime(p.check_in_time, locale)}</strong>
                    <br />
                    Check-out by <strong className="text-ink">{formatTime(p.check_out_time, locale)}</strong>
                  </p>
                  {p.check_in_info && <p className="mt-3 text-sm text-ink-soft">{p.check_in_info}</p>}
                </div>
                <div className="card p-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Icon name="list" className="h-4 w-4 text-gold-600" /> House rules
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                    {rules.map((r) => (
                      <li key={r} className="flex gap-2">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card p-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Icon name="shield" className="h-4 w-4 text-gold-600" /> Cancellation
                  </h3>
                  <p className="mt-3 text-sm text-ink-soft">{policy.cancellationSummary}</p>
                  <Link href="/legal/cancellation" className="mt-3 inline-block text-sm font-semibold text-gold-600 underline underline-offset-2">
                    Full cancellation policy
                  </Link>
                </div>
              </div>
            </section>

            <section aria-labelledby="location">
              <h2 id="location" className="font-display text-2xl">
                Where you&apos;ll be
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {p.town}, {p.region}. The map shows the general area; the exact address is shared after booking.
              </p>
              {hasMap && (
                <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-sand-200">
                  <iframe
                    title={`Map of the area around ${p.town}`}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
                    className="h-80 w-full border-0 grayscale-[30%]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              {p.area_info && <p className="mt-5 leading-relaxed text-ink-soft">{p.area_info}</p>}
            </section>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Book this home">
            <BookingPanel fromPrice={from} minNights={p.min_nights} />
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-muted">
              <Icon name="chat" className="h-4 w-4" />
              Questions?{" "}
              <Link href={`/contact?property=${p.slug}`} className="font-semibold text-ink underline underline-offset-2">
                Ask the owner
              </Link>
            </p>
          </aside>
        </div>
      </div>
      <MobileBookingBar fromPrice={from} />
    </BookingProvider>
  );
}
