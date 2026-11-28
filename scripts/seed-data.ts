import { REAL_LISTINGS } from "./real-properties";
import { HOUSE_RULES, LEGAL_PAGES, CANCELLATION_FAQ, ABOUT_PAGE, FAQ_UPDATES, LOCKBOX_SLUGS, checkInInfoFor, CHECK_IN_FAQ } from "../src/content/launch";

/**
 * DEMONSTRATION CONTENT. Every name, description and price below is a
 * placeholder to show the design. Replace it all from the admin dashboard.
 */

export type SeedProperty = {
  slug: string;
  name: string;
  property_type: string;
  summary: string;
  description: string;
  town: string;
  region: string;
  latitude: number;
  longitude: number;
  area_info: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  max_guests: number;
  amenities: string[];
  base_rate: number;
  weekend_rate: number | null;
  cleaning_fee: number;
  min_nights: number;
  check_in_time: string;
  check_out_time: string;
  check_in_info: string;
  house_rules: string;
  featured: number;
  seasons: { name: string; start: string; end: string; rate: number; min?: number }[];
  images: { file: string; alt: string }[];
};

const imgs = (slug: string, name: string) => [
  { file: `${slug}-exterior`, alt: `Placeholder illustration of the building at ${name}` },
  { file: `${slug}-living`, alt: `Placeholder illustration of the living room at ${name}` },
  { file: `${slug}-bedroom`, alt: `Placeholder illustration of a bedroom at ${name}` },
  { file: `${slug}-kitchen`, alt: `Placeholder illustration of the kitchen at ${name}` },
  { file: `${slug}-view`, alt: `Placeholder illustration of the area around ${name}` },
];

/** Seasons for the current and next year, generated relative to `year`. */
function seasons(year: number, summer: number, festive: number) {
  const out: SeedProperty["seasons"] = [];
  for (const y of [year, year + 1]) {
    out.push({ name: "Summer", start: `${y}-07-01`, end: `${y}-08-31`, rate: summer });
    out.push({ name: "Christmas & New Year", start: `${y}-12-20`, end: `${y + 1}-01-02`, rate: festive });
  }
  return out;
}

const RULES_COMMON = HOUSE_RULES;
const SELF_CHECK_IN = "Self check-in with a key safe or smart lock. Your arrival guide and access code are emailed before your stay.";

type Area = { town: string; latitude: number; longitude: number; area_info: string };

/** Placeholder area details. Check every line against your own knowledge before launch. */
const AREAS: Record<string, Area> = {
  wembley: {
    town: "Wembley",
    latitude: 51.556,
    longitude: -0.2796,
    area_info:
      "Placeholder area guide: Wembley Stadium, OVO Arena Wembley and the London Designer Outlet are close by. Wembley Park station (Jubilee and Metropolitan lines) gets you into central London quickly. Please check and edit this text.",
  },
  cockfosters: {
    town: "Cockfosters",
    latitude: 51.6517,
    longitude: -0.1496,
    area_info:
      "Placeholder area guide: Cockfosters is at the northern end of the Piccadilly line, with a direct Tube into central London. Trent Park is on the doorstep for walks, and there are cafés and shops along the high street. Please check and edit this text.",
  },
  harrow: {
    town: "Harrow",
    latitude: 51.5806,
    longitude: -0.342,
    area_info:
      "Placeholder area guide: Harrow-on-the-Hill station (Metropolitan line and Chiltern trains) is a short walk away, with St George's and St Ann's shopping centres nearby and views from Harrow on the Hill. Please check and edit this text.",
  },
  hounslow: {
    town: "Hounslow",
    latitude: 51.4668,
    longitude: -0.3615,
    area_info:
      "Placeholder area guide: Hounslow is on the Piccadilly line, a short journey from Heathrow Airport, which makes it handy for early flights. The high street has plenty of places to eat. Please check and edit this text.",
  },
};

type Layout = "studio" | "one" | "two" | "three";

const LAYOUTS: Record<Layout, Pick<SeedProperty, "property_type" | "bedrooms" | "beds" | "bathrooms" | "max_guests"> & { words: string }> = {
  studio: { property_type: "Studio apartment", bedrooms: 0, beds: 1, bathrooms: 1, max_guests: 2, words: "an open-plan studio with a double bed, a compact kitchen and a shower room" },
  one: { property_type: "One-bedroom apartment", bedrooms: 1, beds: 2, bathrooms: 1, max_guests: 4, words: "a one-bedroom apartment with a double bedroom, a sofa bed in the living room and a fully equipped kitchen" },
  two: { property_type: "Two-bedroom apartment", bedrooms: 2, beds: 3, bathrooms: 1, max_guests: 5, words: "a two-bedroom apartment with a double room, a twin room and an open-plan kitchen and living space" },
  three: { property_type: "Three-bedroom house", bedrooms: 3, beds: 4, bathrooms: 2, max_guests: 7, words: "a three-bedroom house with two bathrooms, a dining table for everyone and space to spread out" },
};

function apartment(
  area: keyof typeof AREAS,
  n: number,
  layout: Layout,
  opts: { year: number; rate: number; cleaning: number; amenities: string[]; featured?: boolean; offset: [number, number]; extraRules?: string },
): SeedProperty {
  const a = AREAS[area];
  const l = LAYOUTS[layout];
  const name = `${a.town} Apartment ${n}`;
  const slug = `${area}-apartment-${n}`;
  return {
    slug,
    name: layout === "three" ? `${a.town} House ${n}` : name,
    property_type: l.property_type,
    summary: `Placeholder summary: ${l.words}, in ${a.town}. Replace this with the summary from your listing.`,
    description: `This is placeholder text. Imagine ${l.words}, close to transport links in ${a.town}.\n\nGuests have fast wifi, fresh linen and towels, and self check-in, so arrival is easy whatever time you land.\n\nReplace this description from the admin dashboard with the wording from your own listing.`,
    town: a.town,
    region: "London",
    latitude: Number((a.latitude + opts.offset[0]).toFixed(4)),
    longitude: Number((a.longitude + opts.offset[1]).toFixed(4)),
    area_info: a.area_info,
    bedrooms: l.bedrooms,
    beds: l.beds,
    bathrooms: l.bathrooms,
    max_guests: l.max_guests,
    amenities: ["wifi", "kitchen", "heating", "linen", "self_check_in", "tv", ...opts.amenities],
    base_rate: opts.rate,
    weekend_rate: Math.round((opts.rate * 1.15) / 500) * 500,
    cleaning_fee: 0, // Hannah charges no cleaning fees
    min_nights: 1, // Hannah: minimum stay is 1 night everywhere
    check_in_time: "15:00",
    check_out_time: "10:00",
    check_in_info: SELF_CHECK_IN,
    house_rules: RULES_COMMON + (opts.extraRules ? `\n${opts.extraRules}` : ""),
    featured: opts.featured ? 1 : 0,
    seasons: seasons(opts.year, Math.round((opts.rate * 1.3) / 500) * 500, Math.round((opts.rate * 1.45) / 500) * 500),
    images: imgs(slug, layout === "three" ? `${a.town} House ${n}` : name),
  };
}

const HOUNSLOW_SKYLINE: Partial<SeedProperty> = {
  slug: "hounslow-skyline-apartment",
  name: "Hounslow Skyline Apartment",
  property_type: "Two-bedroom apartment",
  summary:
    "Luxury, spacious two-bedroom apartment with stunning skyline views in a secure, gated high-rise near Heathrow. Hounslow Central Tube is a 4-minute walk. Sleeps 8, with free secure parking and an EV charger.",
  description: [
    "Luxury, spacious 2-bedroom Hounslow apartment with stunning skyline views in a secure gated high-rise complex, near Heathrow Airport. Hounslow Central Tube is 4 minutes' walk, with Heathrow 15 to 20 minutes by Tube or 10 to 15 minutes by car. Free secure resident parking with EV charger and 2 lifts. Sleeps 8 with 2 sofa beds, 65\" Smart TV, workspace, coffee machine and air fryer. Family-friendly, ideal for airport stays, large groups, business trips, Twickenham events, long stays and exploring Central London.",
    "## The space",
    "The apartment features two comfortable bedrooms, each furnished with a double bed and a wardrobe for storage. The larger bedroom also includes a dedicated workspace with a desk and chair, along with a wall-mounted 55\" Smart TV, making it ideal for guests who need to work during their stay.",
    "The living room offers a comfortable and relaxing space, with two sofa beds, a 65\" Smart TV, and a foldable dining table with chairs. Plenty of throws and cushions are available throughout the apartment, adding extra comfort and a cosy, luxurious feel.",
    "The fully equipped kitchen has everything you need for a comfortable stay, whether you're visiting for a few nights or planning a longer stay. It includes a coffee machine, air fryer, oven, fridge, microwave, kettle, toaster and all the essential kitchen equipment needed to prepare meals with ease.",
    "Throughout the apartment, comfort and practicality are combined with a luxurious, homely atmosphere, making it an ideal space for families, business travellers or groups of friends looking for a relaxing home away from home.",
    "## Guest access",
    "Guests have full private access to the entire apartment throughout their stay. The property is exclusively yours to enjoy, with no shared spaces or areas with other guests, including the bedrooms, living area, kitchen, dining space and all amenities provided.",
  ].join("\n\n"),
  town: "Hounslow",
  latitude: 51.4713,
  longitude: -0.3665,
  area_info:
    "Hounslow Central Tube station (Piccadilly line) is a 4-minute walk, with Heathrow Airport 15 to 20 minutes by Tube or 10 to 15 minutes by car, and a direct line into Central London. Twickenham Stadium is close by for match days and events.",
  bedrooms: 2,
  beds: 4,
  max_guests: 8,
  amenities: ["wifi", "kitchen", "heating", "linen", "self_check_in", "tv", "workspace", "parking", "ev_charger", "lift", "near_tube", "coffee_machine"],
  check_in_info:
    "Before your stay, all guests complete a quick online check-in form. This is a standard step to verify bookings, meet legal hosting requirements and keep everyone safe. Your information is stored securely, used only for these purposes, and never shared with third parties except where required by law.",
  house_rules:
    "No parties or events\nNo smoking inside the apartment\nPlease keep noise to a minimum, especially in the evening and at night, out of respect for neighbours\nThe number of guests must match the booking, and only registered guests may stay",
  images: [
    { file: "hounslow-skyline-01", alt: "Bright open-plan living room with two grey sofa beds, a 65-inch Smart TV and floor-to-ceiling windows" },
    { file: "hounslow-skyline-02", alt: "Living area with sofa beds, coffee tables and the wall-mounted Smart TV" },
    { file: "hounslow-skyline-03", alt: "Open-plan living room and kitchen with skyline views through the windows" },
    { file: "hounslow-skyline-04", alt: "Living room with sofa beds leading through to the fitted kitchen" },
    { file: "hounslow-skyline-05", alt: "Main bedroom with a double bed, green throw and wide windows" },
    { file: "hounslow-skyline-06", alt: "Main bedroom double bed with bedside table and lamp" },
    { file: "hounslow-skyline-07", alt: "Second bedroom with a navy throw, double bed and mirrored wardrobe" },
    { file: "hounslow-skyline-08", alt: "Second bedroom with a double bed and large windows" },
    { file: "hounslow-skyline-09", alt: "Bedroom with a wall-mounted Smart TV and double bed" },
    { file: "hounslow-skyline-10", alt: "Bedroom with a double bed beside a wall of windows overlooking the skyline" },
    { file: "hounslow-skyline-11", alt: "Fully equipped fitted kitchen with oven, microwave and hob" },
    { file: "hounslow-skyline-12", alt: "Kitchen with skyline views across the living area" },
    { file: "hounslow-skyline-13", alt: "Kitchen with oven, microwave, kettle and toaster" },
    { file: "hounslow-skyline-14", alt: "Kitchen and hallway leading to the bedrooms" },
    { file: "hounslow-skyline-15", alt: "Bathroom with a bath, overhead shower and toilet" },
    { file: "hounslow-skyline-16", alt: "Bathroom basin with mirror and toiletries" },
    { file: "hounslow-skyline-17", alt: "Smart TV with floor lamps and a sofa bed by the window" },
    { file: "hounslow-skyline-18", alt: "Sofa bed with cushions and a side table" },
    { file: "hounslow-skyline-19", alt: "TV unit and storage beside the sofa beds" },
    { file: "hounslow-skyline-20", alt: "Round coffee table with books in the living room" },
    { file: "hounslow-skyline-21", alt: "Sofa bed with built-in cup holders and a cushion" },
    { file: "hounslow-skyline-22", alt: "Sofa bed with soft cushions and throws" },
    { file: "hounslow-skyline-23", alt: "Workspace with a desk by the window" },
    { file: "hounslow-skyline-24", alt: "Bedside lamp and table next to the double bed" },
    { file: "hounslow-skyline-25", alt: "Double bed with green and cream cushions" },
    { file: "hounslow-skyline-26", alt: "Framed artwork in the bedroom" },
    { file: "hounslow-skyline-27", alt: "Double bed with navy and cream cushions" },
    { file: "hounslow-skyline-28", alt: "Bedside table with lamp next to the bed" },
    { file: "hounslow-skyline-29", alt: "Kitchen worktop with knife block, salt and pepper mills" },
    { file: "hounslow-skyline-30", alt: "Air fryer and coffee machine on the kitchen worktop" },
  ],
};

/** Lockbox self check-in in Cockfosters and Hounslow, concierge in Wembley and Harrow (client, 2026-11-28). */
function withCheckInArrangements(p: SeedProperty): SeedProperty {
  const lockbox = LOCKBOX_SLUGS.includes(p.slug);
  const amenities = p.amenities.filter((a) => a !== "self_check_in" && a !== "concierge");
  amenities.splice(4, 0, lockbox ? "self_check_in" : "concierge");
  return { ...p, check_in_info: checkInInfoFor(p.slug), amenities };
}

export function seedProperties(year: number): SeedProperty[] {
  // Hannah's real listings (2026-11-03). No cleaning fees, 1-night minimum. Nightly rates are placeholders until they come from Smoobu.
  return [
    {
      ...apartment("hounslow", 1, "two", { year, rate: 12000, cleaning: 5500, amenities: [], featured: true, offset: [0, 0] }),
      ...HOUNSLOW_SKYLINE,
    },
    ...REAL_LISTINGS.map(({ listing, rate, cleaning }) => {
      const area = listing.town.toLowerCase() as keyof typeof AREAS;
      const base = apartment(area, 1, "one", { year, rate, cleaning, amenities: [], featured: !!listing.featured, offset: [0, 0] });
      return { ...base, region: "London", ...listing } as SeedProperty;
    }),
  ].map(withCheckInArrangements);
}

export const SEED_FAQS: { q: string; a: string; c: string }[] = ([
  { c: "Booking", q: "How do I book?", a: "Choose a home, select your dates and number of guests, and you'll see the full price before you pay. Booking takes a few minutes and you don't need an account." },
  { c: "Booking", q: "Is the price I see the final price?", a: "Yes. The total shown before you pay includes the nightly rate and any applicable taxes. There are no cleaning fees and no booking fees." },
  { c: "Booking", q: "Is there a minimum stay?", a: "No, you can book any of our homes for just one night." },
  { c: "Payment", q: "How is my payment handled?", a: "Payments are processed securely by our payment provider. We never see or store your card details." },
  { c: "Payment", q: "Can I pay straight from my bank account?", a: "Yes. Choose Pay by Bank at checkout, pick your bank and approve the payment in your banking app. There's no card needed and no bank details to type, and your booking is confirmed straight away." },
  { c: "Payment", q: "When will I be charged?", a: "Placeholder answer: the full amount is due when you book, by card or Pay by Bank. Edit this answer if you take a deposit instead." },
  { c: "Cancellations", q: "What is your cancellation policy?", a: CANCELLATION_FAQ },
  { c: "Cancellations", q: "How do I cancel or change my booking?", a: "Use the link in your confirmation email, or find your booking with your reference and email address on the Manage booking page, then send a cancellation request. For changes, contact us directly." },
  { c: "Your stay", q: "What time are check-in and check-out?", a: CHECK_IN_FAQ },
  { c: "Your stay", q: "Are pets allowed?", a: "Some of our homes welcome dogs. Use the “Dogs welcome” filter on the Stays page, and please mention your dog when booking." },
  { c: "Your stay", q: "Are linen and towels provided?", a: "Yes, all homes include fresh bed linen and towels, plus essentials to get you started." },
] as { q: string; a: string; c: string }[]).map((f) => {
  const u = FAQ_UPDATES.find((x) => x.match === f.q);
  return u ? { ...f, q: u.q, a: u.a } : f;
});

const DRAFT_NOTE = "**Draft content for review.** This page contains placeholder wording only and is not legal advice. Have it reviewed and replaced before launch.";

export const SEED_PAGES = [
  {
    slug: "about",
    title: "About us",
    meta_title: "About us",
    meta_description: ABOUT_PAGE.meta_description,
    is_draft: 0,
    body: ABOUT_PAGE.body,
  },
  ...LEGAL_PAGES.map((p) => ({ ...p, is_draft: 0 })),
];

export const DEMO_GUESTS = [
  "Alex Morgan",
  "Sam Patel",
  "Jordan Lee",
  "Casey Thompson",
  "Riley Evans",
  "Morgan Hughes",
  "Taylor Shah",
  "Jamie Clarke",
  "Robin Okafor",
  "Charlie Wright",
  "Avery Collins",
  "Quinn Murphy",
];
