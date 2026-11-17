# Smoobu, PriceLabs and Airbnb: how they would fit with the website

Nothing below is connected yet. Connecting needs your Smoobu API key, and we will only do it when you say so.

## Smoobu (calendar, prices, availability)

Smoobu has a public API ([docs](https://docs.smoobu.com/)), so the website can sync with it:

- **Read from Smoobu, per apartment and per date:** the nightly price, the minimum stay and whether the night is available (`GET /api/rates`).
- **Write to Smoobu:** when a guest books on the website, create the reservation in Smoobu (`POST /api/reservations`). Smoobu then blocks those dates on Airbnb and your other channels, so you can't be double-booked.
- **Cancel in Smoobu** when a website booking is cancelled.
- **Limits:** 700 requests a minute, which is plenty for ten apartments.
- **Security:** Smoobu now uses signed (HMAC) API keys. The older plain API key header is switched off on **31 October 2026**, so we'd set it up the new way.

What the API does **not** give us: listing photos and descriptions. Those still need adding once through the dashboard.

## PriceLabs (dynamic pricing)

PriceLabs already sends your daily prices and minimum stays into Smoobu ([PriceLabs help](https://help.pricelabs.co/portal/kb/articles/smoobu)). Because the website would read prices from Smoobu, it gets the PriceLabs prices automatically. **No separate PriceLabs connection is needed.**

## Live calendars on the website

The availability calendar on each apartment page would come straight from Smoobu, so it matches Airbnb. We would refresh it every few minutes and check Smoobu again at the moment a guest pays, so a night booked on Airbnb a minute earlier can't be sold twice.

## Airbnb discounts

You're right: discounts set inside Airbnb (weekly, monthly, early-bird, last-minute, promotions) belong to Airbnb and won't carry over. The options are:

- set the same discounts in the website dashboard (it already supports long-stay and seasonal pricing, and we can add weekly/monthly percentages), or
- set them in Smoobu or PriceLabs if you want one place to manage them. Which of these works depends on how your Smoobu account applies them, which we'd check once connected.

Many hosts deliberately keep the direct price a little lower than Airbnb anyway, because there is no Airbnb guest service fee.

## Bringing over your Airbnb listings

Airbnb doesn't offer a simple export for hosts. The quickest route: send the listing link (or copy the title, description, house rules and amenities) and the photos for each apartment, and we add them through the dashboard. Smoobu can fill in the basics (address, bedrooms, max guests) once connected.

## Running the site afterwards

Yes. In this project you can ask Claude to add a new apartment, change text or photos, adjust prices or rules, or fix something. You can also do everyday changes yourself in the dashboard. The site will need a host (web server with a database) once it goes live; the launch checklist covers that.
