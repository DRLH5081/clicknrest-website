# Click N Rest: direct-booking website for London apartments

A boutique holiday-rental site for a single owner with several properties, plus an owner-only dashboard. Every name, description, price, image and booking in it is **placeholder demonstration content**. The images are deliberately illustrations, labelled “Placeholder image”, so nobody mistakes them for the real homes. There are no reviews or ratings anywhere.

**Before real guests use it, work through [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md).**

## Stack
- **Next.js 16** (App Router, React 19, TypeScript), Tailwind CSS
- **SQLite** via better-sqlite3: one persistent file, no separate database server
- **Stripe Checkout** for payments (demo mode until keys are set). Card details never reach this server.
- **Nodemailer/SMTP** for email (demo mode logs emails to the dashboard until configured)
- **sharp** to resize uploaded photos into small/medium/large WebP versions

## Run it locally
Requires Node.js 20 or newer.
```bash
npm install
npm run db:seed        # creates data/faron.db with demo content
npm run dev            # http://localhost:3000
```
Owner dashboard: http://localhost:3000/admin, sign in with `owner@example.com` / `change-me-now` (you'll be asked to change it). Production: `npm run build && npm start`.

`npm run db:reset` wipes the database and photos and re-seeds. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` first to choose your own login.

## What's included
**Public site**: homepage (hero, search, featured homes, brand story, why book direct, local experiences), stays listing (filters for dates, location, guests, bedrooms, price, amenities; sorting; live availability badges; empty states), property pages (gallery with keyboard lightbox, details, amenities, rules, check-in info, cancellation terms, approximate OpenStreetMap area map, keyboard-navigable availability calendar, sticky booking panel with live server-side price breakdown), guest checkout without an account, payment step, confirmation page, manage-booking lookup, cancellation requests, About, Contact/enquiry form, FAQs, Privacy/Terms/Cancellation (draft), sitemap and robots.

**Dashboard (`/admin`)**: overview with revenue, occupancy and arrivals; bookings list with views and search; booking detail with payments, refunds through the provider, cancellation with policy-suggested refund, notes, history and email resend; manual bookings (phone/email/other platforms); one calendar across all properties with date blocking; property editor (details, amenities, rules, location, SEO, photos upload/reorder/cover/alt text, base and weekend rates, cleaning fee, min/max stay, seasonal prices with their own minimum stays, publish/unpublish/archive/reorder); homepage, FAQ and page editing; settings for brand/contact, currency/locale/time zone, tax (included/added/none), booking hold time and cancellation rules; email log; password change.

## How bookings stay safe
- **No double bookings.** Every reserved night is a row in `booking_nights` with a unique `(property, night)` key, written inside an immediate transaction. Two people pressing Book at the same moment can't both win; the loser gets a friendly “just booked” message. Tested with 12 simultaneous requests: 1 succeeded, 11 were refused.
- **Holds.** Starting checkout holds the dates for 30 minutes (configurable). Unpaid holds expire automatically and release the dates. If a payment arrives after a hold expired and the dates have gone, the booking is flagged for a refund rather than double-booked.
- **Prices are computed on the server** for every quote and again when the booking is created; the browser's numbers are never trusted.
- **Guest access** to a booking uses either a private link from the confirmation email (only a hash of its token is stored) or reference + email lookup (rate limited).
- **Owner access**: scrypt-hashed password, signed httpOnly session cookie, every dashboard page and action checks the session, login rate limiting, forced change of the demo password.

## Where things live
| | |
|---|---|
| `src/app/(site)` | Public pages |
| `src/app/admin` | Dashboard pages and server actions (`actions.ts`) |
| `src/app/api` | Quote, availability, booking and Stripe webhook endpoints |
| `src/lib/pricing.ts` | Nightly rates, seasons, minimum stays, tax, validation |
| `src/lib/bookings.ts` | Creating, confirming, cancelling, refunding bookings |
| `src/lib/payments.ts`, `email.ts` | Stripe and email, each with demo fallback |
| `src/lib/amenities.ts` | Amenity list; add entries to offer new amenities |
| `scripts/seed.ts`, `seed-data.ts` | Demo content |
| `scripts/generate-placeholders.py` | Draws the placeholder illustrations |
| `data/` | Database, uploaded photos (keep on persistent disk; back it up) |

Money is stored in pence as integers; dates are stored as `YYYY-MM-DD` and treated as calendar nights, so time zones never shift a booking.
