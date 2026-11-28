/**
 * Owner-approved launch content (house rules, cancellation rules, legal pages).
 * Used by the seed for new databases and applied once to the live database by applyLaunchContent().
 */

export const LAUNCH_CONTENT_VERSION = 7;

export const HOUSE_RULES = [
  "Please check in and check out at the standard times stated on your booking. If you need an earlier check-in or later check-out, this can be arranged with us in advance. Please stick to the time agreed.",
  "This is a mostly permanent-resident building, so please respect our neighbours and keep noise to a minimum, especially after 10pm.",
  "No parties, events, loud music, smoking, vaping, drugs or illegal activity are permitted.",
  "Only registered guests may stay. Any additional guests must be reported and approved in advance. Unauthorised guests may result in additional charges, and the maximum occupancy must never be exceeded.",
  "Please treat the apartment, furniture and building with care. Any damage or breakages must be reported to us immediately. Unreported damage may result in a charge for repair or replacement.",
  "Please do not move furniture, remove items from the apartment or leave rubbish in communal areas.",
  "Commercial filming, photography or content creation involving additional people or equipment must be approved in advance.",
  "Serious breaches of these rules, including parties, excessive noise, unauthorised guests, exceeding capacity, smoking, illegal activity or significant damage, may result in the booking being terminated and guests being required to leave.",
].join("\n");

/** Extra lines for apartments with a balcony. */
export const BALCONY_RULES = "Please use the balcony responsibly and avoid excessive noise outside.\nMake sure doors are securely locked when leaving the apartment.";

export const CANCELLATION = {
  fullRefundDays: 5,
  partialRefundDays: 0,
  partialRefundPercent: 50,
  cancellationSummary: "Full refund if you cancel at least 5 days before check-in. After that, 50% refund if you cancel up to and including the day of check-in.",
};

export const CANCELLATION_FAQ =
  "Full refund if you cancel at least 5 days before check-in. If you cancel less than 5 days before, up to and including the day of check-in, you get a 50% refund. No refund once your stay has started.";

export const LEGAL_PAGES = [
  {
    slug: "privacy",
    title: "Privacy policy",
    meta_title: "Privacy policy",
    meta_description: "How Click'N'Rest collects, uses and protects your personal information.",
    body: `This policy explains how Click N Rest Ltd, trading as Click'N'Rest ("we", "us"), uses your personal information when you visit this website, make an enquiry or book a stay with us. We are the data controller for this information under UK data protection law (the UK GDPR and the Data Protection Act 2018).

Click N Rest Ltd is registered in England and Wales (company number 17265682). Our registered office address is shown at the bottom of every page.

You can contact us about anything in this policy at the email address on our [Contact page](/contact).

## What we collect

- **Contact details:** your name, email address and phone number.
- **Booking details:** your dates, the apartment, number of guests, messages and any special requests.
- **Check-in details:** the information you give in our online check-in form before your stay, which we use to verify bookings and meet our legal hosting obligations.
- **Payment confirmations:** our payment provider tells us whether a payment succeeded. We never see or store your full card details.
- **Technical information:** basic information your browser sends (such as IP address), used to keep the site secure and prevent abuse.

## How we use it, and why we're allowed to

- To take and manage your booking, contact you about your stay and give you access to the apartment (to perform our contract with you).
- To keep financial and tax records (to meet our legal obligations).
- To answer your enquiries (our legitimate interest in responding to you).
- To keep the website and our guests safe, and to prevent fraud (our legitimate interests).

We don't sell your information and we don't send marketing emails.

## Who we share it with

We only share what each service needs to do its job:

- **Stripe**, which processes card and bank payments.
- **Smoobu**, our booking management system, which holds booking and guest details so we can manage the apartments' calendars.
- **Render**, which hosts this website (servers in the EU).
- **Namecheap Private Email**, which handles our email.
- Professional advisers, or the police and other authorities, when the law requires it.

Some of these providers may process data outside the UK. Where they do, they use legal safeguards approved under UK law, such as standard contractual clauses.

## How long we keep it

We keep booking and payment records for 6 years after your stay for tax and accounting purposes. Enquiries that don't lead to a booking are deleted after 12 months.

## Your rights

You can ask us to give you a copy of your information, correct it, delete it, or restrict or object to how we use it. Email us and we'll reply within one month. If you're unhappy with how we've handled your information, you can complain to the Information Commissioner's Office (ICO) at [ico.org.uk](https://ico.org.uk).

## Cookies

This website uses only essential cookies: one to keep your booking session and, for the owner, one to stay signed in. We don't use advertising or tracking cookies, so we don't ask for cookie consent.

## Changes

We may update this policy. The date at the top shows when it last changed.`,
  },
  {
    slug: "terms",
    title: "Booking terms",
    meta_title: "Booking terms and conditions",
    meta_description: "The terms that apply when you book a Click'N'Rest apartment directly.",
    body: `These terms apply when you book an apartment directly on this website with Click N Rest Ltd, trading as Click'N'Rest ("we", "us"), a company registered in England and Wales (company number 17265682). Our registered office address is shown at the bottom of every page. By completing a booking, you agree to them on behalf of everyone in your party.

## Your booking

- Your booking is confirmed once payment has gone through and you receive a confirmation email with your booking reference.
- The person who books must be at least 18 and must stay at the apartment.
- Prices are per night, for the whole apartment, and are shown in pounds sterling. There are no cleaning or booking fees. The total you pay is shown before you pay.
- Full payment is taken when you book.

## Check-in and check-out

- Check-in is from 3pm (15:00) and check-out is by 10am (10:00), unless we agree a different time with you in advance.
- Before your stay, every guest must complete our online check-in form. We may cancel a booking if this isn't completed, or if we can't verify the booking.
- Access details are sent once your check-in form is complete.

## Guests and occupancy

The number of guests must not exceed the maximum shown for the apartment. Only the guests named on the booking may stay. Additional guests must be approved by us in advance.

## House rules

All guests must follow the house rules shown on each apartment's page. Serious breaches, including parties, excessive noise, unauthorised guests, exceeding capacity, smoking, illegal activity or significant damage, may result in your booking being ended and your party being asked to leave.

## Damage

Please treat the apartment and building with care and report any damage straight away. You are responsible for damage caused by you or your party during your stay, beyond normal wear and tear, and we may charge you the reasonable cost of repair or replacement. We'll always tell you what happened and send you evidence before charging anything.

## Cancellations

If you cancel, our [Cancellation policy](/legal/cancellation) applies. Because your booking is for accommodation on specific dates, the 14-day cancellation period under the Consumer Contracts Regulations does not apply.

If we have to cancel your booking (for example, because the apartment becomes unusable), we'll give you a full refund. We'll try to offer you a similar apartment where we can.

## Our responsibility to you

We'll provide the apartment as described, clean and in good working order. If something isn't right, tell us straight away so we can fix it.

We are not responsible for losses we couldn't reasonably foresee, for problems caused by events outside our control (such as utility failures, building works by others or severe weather), or for your belongings. Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot legally be limited. Your legal rights as a consumer are not affected.

## Contact and complaints

If you have a question or a complaint, email us at the address on our [Contact page](/contact) and we'll respond as quickly as we can.

These terms are governed by the law of England and Wales.`,
  },
  {
    slug: "cancellation",
    title: "Cancellation policy",
    meta_title: "Cancellation policy",
    meta_description: "Click'N'Rest cancellation and refund policy for direct bookings.",
    body: `## If you cancel

- **5 days or more before check-in:** full refund.
- **Less than 5 days before check-in, up to and including the day of check-in:** 50% refund.
- **After your stay has started:** no refund for unused nights.

"Days before check-in" are counted from the date you cancel to your check-in date. Refunds go back to your original payment method and usually arrive within 5 to 10 working days.

## How to cancel

Use the link in your confirmation email, or go to Manage booking and enter your booking reference and email address. You can also email us.

## Changing your dates

Contact us before cancelling. If the apartment is free on your new dates, we'll do our best to move your booking.

## If we need to cancel

In the unlikely event we have to cancel, you'll get a full refund.

## Travel insurance

We recommend travel insurance that covers cancellation, in case your plans change.`,
  },
];

/** Placeholder illustration keys replaced by real property photos (owner request, 2026-11-27). */
export const PHOTO_SWAPS: Record<string, string> = {
  "home-hero": "wembley-stadium-view-apartment-32",
  about: "wembley-high-rise-apartment-25",
  "exp-coast": "wembley-high-rise-apartment-11",
  "exp-walks": "wembley-balcony-apartment-25",
  "exp-food": "wembley-family-apartment-37",
};

/** Final site copy replacing placeholder wording (owner request, 2026-11-27). */
export const HOME_COPY = {
  heroIntro: "Nine self-catering apartments across Wembley, Cockfosters, Harrow and Hounslow, with fast Wi-Fi, easy check-in from 3pm and no booking fees when you book direct.",
  introBody:
    "Click'N'Rest looks after nine apartments across north and west London. Each one is yours alone, with a fully equipped kitchen, fresh linen and towels, and check-in from 3pm. If you need anything before or during your stay, you deal with us directly, every day from 9am to 9pm.",
  experiencesIntro: "Whether you're here for a big night at Wembley, a quieter break or a flight out of Heathrow, there's an apartment in the right place.",
  experienceBodies: [
    "Wembley Stadium and OVO Arena Wembley are about a 10-minute walk from our Wembley apartments, so concerts and match days are easy.",
    "Trent Park is close to our Cockfosters apartments for long walks, and Harrow on the Hill has some of the best views across London.",
    "Cockfosters and Hounslow are on the Piccadilly line, with direct trains into central London and to Heathrow, and Wembley has fast trains into the city.",
  ],
};

export const ABOUT_PAGE = {
  meta_description: "Click'N'Rest: nine self-catering apartments across Wembley, Cockfosters, Harrow and Hounslow, booked directly with no booking fees.",
  body: `## A small collection, cared for personally

Click'N'Rest is a collection of nine self-catering apartments across Wembley, Cockfosters, Harrow and Hounslow. Each one is a whole apartment to yourself, with a fully equipped kitchen, fast Wi-Fi and check-in from 3pm.

## How we look after guests

- Every apartment is cleaned and made up with fresh linen and towels before you arrive.
- A quick online check-in before your stay, then collect your keys from a lockbox or the building's concierge.
- Earlier check-in or later check-out can often be arranged for £15 per hour. Just message us.
- One point of contact from booking to check-out, every day from 9am to 9pm.

## Booking directly

When you book here, you deal directly with us. There are no cleaning fees and no booking fees, you can stay for just one night, and our cancellation terms are shown before you pay. If you have a question, call or email us any time.`,
};

export const FAQ_UPDATES: { match: string; q: string; a: string }[] = [
  { match: "Can I pay straight from my bank account?", q: "Which payment methods do you accept?", a: "You can pay by debit or credit card, Apple Pay or Google Pay. Payments are handled securely by Stripe, and we never see or store your card details." },
  { match: "When will I be charged?", q: "When will I be charged?", a: "The full amount is taken when you book, and your booking is confirmed as soon as the payment goes through." },
  { match: "Are pets allowed?", q: "Are pets allowed?", a: "Please contact us before booking if you'd like to bring a pet, so we can check whether the apartment is suitable." },
];

/** Check-in arrangements by building (client, 2026-11-28). */
export const CHECK_IN_FORM_TEXT =
  "Before your stay, all guests complete a quick online check-in form. This is a standard step to verify bookings, meet legal hosting requirements and keep everyone safe. Your information is stored securely, used only for these purposes, and never shared with third parties except where required by law.";
export const EARLY_LATE_TEXT = "Need an earlier check-in or a later check-out? We can often arrange it for £15 per hour, subject to availability. Just message us to arrange it.";
export const LOCKBOX_ARRIVAL = "Self check-in with a lockbox, so you can arrive any time from 3pm.";
export const CONCIERGE_ARRIVAL =
  "Keys are collected from the building's concierge, available until 10pm. Arriving after 10pm? Let us know in advance and we'll leave your key in a lockbox.";
export const LOCKBOX_SLUGS = ["cockfosters-arcade-apartment", "cockfosters-games-room-apartment", "hounslow-skyline-apartment", "hounslow-central-apartment"];
export const checkInInfoFor = (slug: string) => `${LOCKBOX_SLUGS.includes(slug) ? LOCKBOX_ARRIVAL : CONCIERGE_ARRIVAL} ${CHECK_IN_FORM_TEXT} ${EARLY_LATE_TEXT}`;
export const CHECK_IN_FAQ =
  "Check-in is from 3pm (15:00) and check-out is by 10am (10:00). In Cockfosters and Hounslow you check in yourself with a lockbox, any time after 3pm. In Wembley and Harrow the building's concierge hands over keys until 10pm; if you'll arrive later, let us know in advance and we'll leave your key in a lockbox. Earlier check-in or later check-out can often be arranged for £15 per hour, subject to availability: just message us.";
