# Launch checklist

The site works end to end today in **demo mode**: bookings are real records in the database, but payment is simulated and emails are only logged. Nothing below is needed to try it locally. Everything here is needed before real guests use it.

## 1. Connect payments (Stripe)
Without this, the payment step is a clearly labelled simulation and no money is taken.
- [ ] Create a Stripe account and complete business verification.
- [ ] Set `STRIPE_SECRET_KEY` (start with a `sk_test_…` key, switch to `sk_live_…` at launch).
- [ ] In Stripe → Developers → Webhooks, add `https://YOUR-DOMAIN/api/stripe/webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Set `STRIPE_WEBHOOK_SECRET` to its signing secret.
- [ ] Make a test booking with card `4242 4242 4242 4242`, then refund it from the dashboard and confirm it appears in Stripe.
- Note: the Stripe code paths are written against Stripe's documented API but could not be exercised from the build environment (no access to Stripe). Test them in Stripe test mode before going live.

## 2. Connect email
Without this, confirmations appear only in Dashboard → Email log.
- [ ] Choose an SMTP provider (Postmark, Resend, SendGrid, Amazon SES or your email host) and verify your sending domain (SPF/DKIM).
- [ ] Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
- [ ] Make a booking and check both the guest and owner emails arrive and links work.

## 3. Hosting
The app needs a Node.js server with a **persistent disk** (the SQLite database and photos are files). Good fits: a small VPS, Railway, Render or Fly.io with a volume. Serverless hosts without a disk (e.g. plain Vercel) won't keep data.
- [ ] Set `SITE_URL` to your real https address and a long random `SESSION_SECRET`.
- [ ] Point `DATA_DIR` at the persistent volume.
- [ ] Serve over HTTPS only.
- [ ] Back up `DATA_DIR` daily (database + uploads) and test a restore.
- [ ] Run one server instance (SQLite is single-server). For several instances, move to PostgreSQL; the overlap protection is a database unique constraint and carries over directly.

## 4. Replace demo content
- [ ] Start clean: `ADMIN_EMAIL=you@domain ADMIN_PASSWORD='long-password' npm run db:reset`, then archive or edit the ten demo apartments (replace the placeholder text, photos and prices with your real listing details) (or delete `data/` and re-seed and edit everything).
- [ ] Remove the demo bookings and enquiry (a reset does this).
- [ ] Brand name, contact details, owner notification email: Settings → Business & contact.
- [ ] Homepage text and images: Site content.
- [ ] Each property: details, photos with descriptions, prices, seasons, minimum stays, house rules, approximate map position.
- [ ] FAQs.
- [ ] Replace the logo mark in `src/components/site/Header.tsx` and `public/icon.svg` if you have your own.

## 5. Legal and policy review
The Privacy policy, Booking terms and Cancellation policy pages contain **placeholder draft wording** and say so on the page.
- [ ] Have them reviewed or rewritten by a professional, then untick “Show Draft for review label”.
- [ ] Make sure the cancellation numbers in Settings → Booking rules match the policy text.
- [ ] Confirm the VAT/tax setting with your accountant (default: 20% VAT included in prices).
- [ ] Check obligations for your area (e.g. short-term let licensing or registration, safety certificates, data protection registration).

## 6. Final checks
- [ ] Sign in to `/admin` and change the password if you haven't (the dashboard nags until you do).
- [ ] Book, pay, cancel and refund a test stay on the live site.
- [ ] Submit the sitemap (`/sitemap.xml`) in Google Search Console.

## Smoobu and PriceLabs (optional, not connected yet)

- [ ] Decide whether the website should read prices, minimum stays and availability from Smoobu (recommended, see `SMOOBU-AND-PRICELABS.md`).
- [ ] Create a Smoobu API key with HMAC signing (the old `Api-Key` header stops working on 31 October 2026).
- [ ] Map each website apartment to its Smoobu apartment ID.
- [ ] Test that a direct booking on the website appears in Smoobu and blocks Airbnb.

## Pay by Bank (Stripe)

- [ ] In Stripe, go to Settings, then Payment methods, and turn on **Pay by Bank**. It then shows at checkout next to card payments, with no code change.
- [ ] Check Stripe's fees for Pay by Bank on your account.
- [ ] Make a small real test booking with Pay by Bank and refund it from the dashboard.
- [ ] Manual bank transfer is also available but switched off (Settings, then Manual bank transfer). If you turn it on, replace the placeholder account details first.
