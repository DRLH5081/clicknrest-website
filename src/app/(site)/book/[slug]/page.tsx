import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPropertyBySlug } from "@/lib/properties";
import { getSetting, bankTransferAvailable } from "@/lib/settings";
import { quoteStay } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { paymentMode } from "@/lib/payments";
import { BookingForm } from "@/components/site/BookingForm";
import { StaySummary } from "@/components/site/StaySummary";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Confirm and pay", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;

export default async function BookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = getPropertyBySlug(slug, { publishedOnly: true });
  if (!p) notFound();
  const { locale } = getSetting("regional");
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const guests = Math.max(1, Number(s("guests")) || 1);
  const q = quoteStay(p, { checkIn: s("checkIn"), checkOut: s("checkOut"), guests });

  return (
    <div className="container-x max-w-6xl pt-8 md:pt-12">
      <Link href={`/stays/${p.slug}?checkIn=${s("checkIn")}&checkOut=${s("checkOut")}&guests=${guests}`} className="btn-ghost -ml-3 mb-4">
        <Icon name="arrowLeft" className="h-4 w-4" /> Back to {p.name}
      </Link>
      <h1 className="font-display text-3xl md:text-4xl">Confirm your stay</h1>

      {!q.ok ? (
        <div className="card mt-8 max-w-xl p-8">
          <h2 className="font-display text-xl">These dates can&apos;t be booked</h2>
          <p className="mt-2 text-ink-soft">{q.message}</p>
          <Link href={`/stays/${p.slug}`} className="btn-primary mt-6">
            Choose new dates
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
          <div className="order-2 lg:order-1">
            <BookingForm
              slug={p.slug}
              checkIn={s("checkIn")}
              checkOut={s("checkOut")}
              guests={guests}
              maxGuests={p.max_guests}
              demo={paymentMode() === "demo"}
              holdMinutes={getSetting("booking").holdMinutes}
              bankTransfer={bankTransferAvailable()}
              totalLabel={formatMoney(q.breakdown.total, q.breakdown.currency, locale)}
            />
          </div>
          <aside className="order-1 lg:order-2 lg:sticky lg:top-28 lg:self-start">
            <StaySummary
              name={p.name}
              location={`${p.town}, ${p.region}`}
              image={p.images[0]}
              checkIn={s("checkIn")}
              checkOut={s("checkOut")}
              guestsLabel={`${guests} ${guests === 1 ? "guest" : "guests"}`}
              checkInTime={p.check_in_time}
              checkOutTime={p.check_out_time}
              breakdown={q.breakdown}
              locale={locale}
            />
            <div className="mt-4 rounded-2xl bg-sand-100 p-4 text-sm text-ink-soft">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <Icon name="shield" className="h-4 w-4" /> Cancellation terms
              </p>
              <p className="mt-1.5">{getSetting("booking").cancellationSummary}</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
