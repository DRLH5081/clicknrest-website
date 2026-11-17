import Link from "next/link";
import { Picture } from "../Picture";
import { Icon } from "../Icon";
import { formatMoney } from "@/lib/format";

export type CardProperty = {
  slug: string;
  name: string;
  town: string;
  region: string;
  property_type: string;
  max_guests: number;
  bedrooms: number;
  image?: { media_key: string; alt: string };
  fromPrice: number;
  /** When dates are searched: total for the stay */
  stayTotal?: number;
  stayNights?: number;
  availability?: { kind: "available" | "unavailable" | "next"; label: string };
};

export function PropertyCard({ p, currency, locale, query = "", priority = false }: { p: CardProperty; currency: string; locale: string; query?: string; priority?: boolean }) {
  const unavailable = p.availability?.kind === "unavailable";
  return (
    <article className={`group relative flex flex-col ${unavailable ? "opacity-70" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-sand-200">
        <Picture
          mediaKey={p.image?.media_key}
          alt={p.image?.alt ?? p.name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full transition duration-700 ease-out group-hover:scale-[1.04]"
          priority={priority}
        />
        {p.availability && (
          <span
            className={`badge absolute left-3 top-3 shadow-soft ${
              p.availability.kind === "available" ? "bg-olive-50 text-olive-700" : p.availability.kind === "unavailable" ? "bg-white text-ink-soft" : "bg-white/95 text-ink"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${p.availability.kind === "available" ? "bg-olive-600" : p.availability.kind === "unavailable" ? "bg-ink-muted" : "bg-gold-500"}`} aria-hidden />
            {p.availability.label}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-snug">
            <Link href={`/stays/${p.slug}${query}`} className="after:absolute after:inset-0 after:rounded-3xl focus:outline-none">
              {p.name}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted">
            <Icon name="pin" className="h-3.5 w-3.5" />
            {p.town}, {p.region}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-sand-200 pt-3 text-sm">
        <span className="flex items-center gap-3 text-ink-soft">
          <span className="flex items-center gap-1">
            <Icon name="users" className="h-4 w-4" /> {p.max_guests} guests
          </span>
          <span className="flex items-center gap-1">
            <Icon name="bed" className="h-4 w-4" /> {p.bedrooms} {p.bedrooms === 1 ? "bedroom" : "bedrooms"}
          </span>
        </span>
        {p.stayTotal != null && p.stayNights ? (
          <span className="text-right">
            <span className="font-semibold">{formatMoney(p.stayTotal, currency, locale, { whole: true })}</span>
            <span className="text-ink-muted"> total</span>
          </span>
        ) : (
          <span className="text-right">
            <span className="text-ink-muted">from </span>
            <span className="font-semibold">{formatMoney(p.fromPrice, currency, locale, { whole: true })}</span>
            <span className="text-ink-muted"> / night</span>
          </span>
        )}
      </div>
    </article>
  );
}
