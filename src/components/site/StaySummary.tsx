import { Picture } from "../Picture";
import { Icon } from "../Icon";
import { PriceSummary } from "./PriceSummary";
import { formatDate } from "@/lib/dates";
import type { PriceBreakdown } from "@/lib/pricing";

export function StaySummary(props: {
  name: string;
  location: string;
  image?: { media_key: string; alt: string };
  checkIn: string;
  checkOut: string;
  guestsLabel: string;
  checkInTime: string;
  checkOutTime: string;
  breakdown: PriceBreakdown | null;
  locale: string;
}) {
  const { locale } = props;
  return (
    <div className="card overflow-hidden">
      <div className="flex gap-4 border-b border-sand-200 p-5">
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl">
          <Picture mediaKey={props.image?.media_key} alt={props.image?.alt ?? ""} sizes="96px" className="h-full w-full" />
        </div>
        <div>
          <h2 className="font-display text-lg leading-snug">{props.name}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted">
            <Icon name="pin" className="h-3.5 w-3.5" /> {props.location}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 border-b border-sand-200 p-5 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Check-in</dt>
          <dd className="mt-1">{formatDate(props.checkIn, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</dd>
          <dd className="text-xs text-ink-muted">from {props.checkInTime}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Check-out</dt>
          <dd className="mt-1">{formatDate(props.checkOut, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</dd>
          <dd className="text-xs text-ink-muted">by {props.checkOutTime}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Guests</dt>
          <dd className="mt-1">{props.guestsLabel}</dd>
        </div>
      </dl>
      {props.breakdown && (
        <div className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Price details</h3>
          <PriceSummary b={props.breakdown} locale={locale} />
        </div>
      )}
    </div>
  );
}
