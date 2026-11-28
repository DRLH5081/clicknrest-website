/**
 * Hannah's real listings (sent 2026-11-03), with photos from her Google Drive folders.
 * No cleaning fees and a 1-night minimum. Nightly rates are PLACEHOLDERS until they come from Smoobu.
 * Anything marked "CHECK" was not stated in her listing text and is a best guess.
 */
import type { SeedProperty } from "./seed-data";
import { HOUSE_RULES, BALCONY_RULES, CHECK_IN_FORM_TEXT } from "../src/content/launch";

/** Alt text by photo kind. */
const ALT: Record<string, string> = {
  L: "Living room with sofas and Smart TV",
  LA: "Open-plan living room with the retro Pac-Man arcade machine",
  K: "Fully equipped kitchen",
  KD: "Kitchen worktop with appliances",
  D: "Dining area",
  DD: "Dining table set for a meal",
  B: "Bedroom with a double bed",
  B2: "Second bedroom with a double bed",
  BD: "Bedroom detail",
  BA: "Bathroom",
  BAD: "Bathroom detail",
  H: "Hallway",
  BAL: "Private balcony with egg chair and outdoor seating",
  TER: "Private rooftop terrace",
  V: "View from the balcony",
  G: "Retro Pac-Man arcade machine",
  P: "Dining table that converts into a games table for pool and table tennis",
  W: "Workspace with desk and chair",
  X: "Interior detail",
};

/** "28L 29LA 13G" -> [{ file: "<prefix>-28", alt: ... }, ...] in that order. */
function photos(prefix: string, spec: string) {
  return spec
    .trim()
    .split(/\s+/)
    .map((t) => {
      const m = /^(\d{2})([A-Z0-9]+)$/.exec(t);
      if (!m || !ALT[m[2]]) throw new Error(`Bad photo token ${t} for ${prefix}`);
      return { file: `${prefix}-${m[1]}`, alt: ALT[m[2]] };
    });
}

const CHECK_IN_FORM = CHECK_IN_FORM_TEXT;

const RULES = HOUSE_RULES;

const PRIVATE_ACCESS =
  "## Guest access\n\nGuests have full private access to the entire apartment throughout their stay. The property is exclusively yours to enjoy, with no shared spaces or areas with other guests. You are welcome to use all areas as your own home, including the bedrooms, living area, kitchen, dining space and all amenities provided.";

const NO_PARKING =
  "## Parking\n\nAs with many areas of London, free parking can be hard to find, and there is currently no free parking at the property (we are working on arranging this). If you're travelling by car, contact us before arrival and we'll recommend convenient places to park.";

const COCKFOSTERS_AREA =
  "Cockfosters Underground Station is a 5-minute walk, at the end of the Piccadilly line, with direct trains to King's Cross, Covent Garden, Leicester Square and Heathrow Airport. Free parking is available on nearby residential side roads with no permit required, and we're happy to recommend the best places to park before you arrive.";

const WEMBLEY_AREA =
  "Wembley Stadium is about a 10-minute walk, with Wembley Stadium Station close by for fast trains into Central London. OVO Arena Wembley, Boxpark and the London Designer Outlet are all nearby, along with plenty of shops and restaurants.";

const p = (s: string[]) => s.join("\n\n");

/** Fields that override the generated placeholder defaults (rates, seasons) for each real listing. */
export type RealListing = Partial<SeedProperty> & Pick<SeedProperty, "slug" | "name" | "town" | "images">;

export const REAL_LISTINGS: { listing: RealListing; rate: number; cleaning: number }[] = [
  // Property 2
  {
    rate: 11000,
    cleaning: 5000,
    listing: {
      slug: "cockfosters-arcade-apartment",
      name: "Cockfosters Arcade Apartment",
      property_type: "One-bedroom apartment",
      featured: 1,
      summary:
        "Luxury modern one-bedroom apartment in peaceful Cockfosters, a short walk from the Piccadilly line. 75\" Smart TV with soundbar, a retro Pac-Man arcade machine, private rooftop terrace and free parking nearby.",
      description: p([
        "Luxury modern London apartment just a short walk from Cockfosters Underground Station and the Piccadilly Line, with direct access to Central London and Heathrow Airport. Enjoy a fully equipped kitchen, dining area, dedicated workspace, WiFi, coffee machine, air fryer, 75\" Smart TV with soundbar and speakers, plus a retro Pac-Man arcade machine. Peaceful North London location, free nearby parking and rooftop terrace. Perfect for families, couples, business stays and London getaways.",
        "## The space",
        "Welcome to our stylish and spacious one-bedroom apartment in peaceful Cockfosters, North London. Perfect for couples, families, friends, business travellers and longer stays, this modern home offers the perfect balance of luxury, comfort and convenience.",
        "Designed with high-quality rustic furnishings and a bright, open layout, the apartment features a comfortable double bedroom alongside two large sofas that easily convert into sofa beds, with fresh hotel-quality linen, spare bedding and extra towels provided for your stay.",
        "Relax in the cosy living area with a stunning 75-inch Smart TV, or unwind in the bedroom with its own Smart TV, giving everyone space to enjoy their favourite shows. The fully equipped kitchen includes everything needed for home cooking, including an oven, hob, microwave, fridge freezer, coffee machine, air fryer, kettle, toaster and all essential cookware and utensils.",
        "One of the standout features of the apartment is our retro Pac-Man arcade machine! Step back in time and challenge your friends or family to a few rounds of this iconic arcade classic. Whether you're reliving childhood memories or discovering Pac-Man for the first time, the machine is guaranteed to add a little extra fun to your stay.",
        "After a day of exploring, grab a drink, fire up the arcade and see who can claim the high score. Just be warned: you may find yourself saying \"one more game…\" long after everyone else has gone to bed!",
        "Step outside onto the private rooftop terrace, ideal for your morning coffee or relaxing after a day exploring London. Families are well catered for with a highchair provided, generous living space and a welcoming layout that makes travelling with children easy.",
        "You'll also benefit from fast WiFi, self check-in, and free parking on nearby residential side roads with no permit required.",
        "## Guest access",
        "Guests have exclusive access to the entire apartment throughout their stay, including the bedroom, bathroom, living area, fully equipped kitchen, private rooftop terrace and all amenities. The property is completely private with self check-in, so you can relax and make yourself at home.",
        "## Good to know",
        "There is no lift to the apartment. It is on the second floor, so you will only need to climb two short flights of stairs.",
        "We're always happy to help with any questions before or during your stay. Our team is just a message away, and if anything urgent arises, a member of our team can attend the property.",
      ]),
      town: "Cockfosters",
      latitude: 51.6517,
      longitude: -0.1496,
      area_info: COCKFOSTERS_AREA,
      bedrooms: 1,
      beds: 3,
      bathrooms: 1,
      max_guests: 6, // CHECK: summary says sleeps 6, "The space" says up to 4
      amenities: ["wifi", "kitchen", "heating", "linen", "self_check_in", "tv", "workspace", "parking", "near_tube", "roof_terrace", "games", "coffee_machine", "high_chair"],
      check_in_info: CHECK_IN_FORM,
      house_rules: RULES,
      images: photos(
        "cockfosters-arcade-apartment",
        "28L 29L 27LA 30L 31L 34LA 35LA 33K 32K 25D 26D 17B 18B 21B 19B 20B 22BA 23BA 24BA 13G 36H 37H 38H 14KD 15KD 16KD 08DD 09DD 10L 11L 12L 01BD 02BD 03BD 04X 05BAD 06BAD 07BAD",
      ),
    },
  },
  // Property 3
  {
    rate: 11000,
    cleaning: 5000,
    listing: {
      slug: "wembley-balcony-apartment",
      name: "Wembley Balcony Apartment",
      property_type: "One-bedroom apartment",
      featured: 1,
      summary:
        "Family-friendly apartment a 10-minute walk from Wembley Stadium, with a private balcony, egg chair and outdoor dining. Two sofa beds, 65\" Smart TV and a dedicated workspace, in a gated complex with a children's playground and 2 lifts.",
      description: p([
        "Wembley Stadium is just a 10-minute walk from this family-friendly London apartment! Enjoy a private balcony with egg chair and outdoor dining, spacious living room with 2 sofa beds, 65\" Smart TV, dining area, coffee machine, air fryer and dedicated workspace. Gated complex with children's playground, terrace and 2 lifts. Wembley Stadium Station is 3 minutes away, with easy Central London access. Perfect for families, events, concerts, business stays, OVO Arena, Boxpark and London Designer Outlet.",
        "## The space",
        "The apartment features a comfortable bedroom with a double bed, wardrobe and additional cupboard space for your belongings. The bedroom also includes a dedicated workspace with a desk and chair, along with a wall-mounted 55\" Smart TV, making it ideal for guests who need to work during their stay.",
        "The living room provides a comfortable and relaxing space, featuring two sofa beds and a 65\" Smart TV. A dining table with chairs is also available, providing a convenient space to enjoy meals together or work during your stay. Plenty of throws and cushions are provided throughout the apartment to create a cosy, comfortable and luxurious atmosphere.",
        "The fully equipped kitchen has everything you need for both short and long stays, including a coffee machine, air fryer, oven, fridge, microwave, kettle, toaster and all the essential kitchen equipment needed to prepare meals with ease.",
        "One of the highlights of the apartment is the private balcony, complete with an outdoor table and chairs, as well as a comfortable egg chair where you can sit back and relax.",
        "Designed with comfort, practicality and a touch of luxury throughout, the apartment offers a welcoming home away from home for couples, families, business travellers or small groups.",
        PRIVATE_ACCESS,
        NO_PARKING,
      ]),
      town: "Wembley",
      latitude: 51.5543,
      longitude: -0.2853,
      area_info:
        "Wembley Stadium is a 10-minute walk and Wembley Stadium Station is just 3 minutes away, with easy access to Central London. OVO Arena Wembley, Boxpark and the London Designer Outlet are all close by.",
      bedrooms: 1,
      beds: 3,
      bathrooms: 1,
      max_guests: 6, // CHECK: not stated; double bed + 2 sofa beds
      amenities: ["wifi", "kitchen", "heating", "linen", "self_check_in", "tv", "workspace", "balcony", "lift", "near_tube", "coffee_machine"],
      check_in_info: CHECK_IN_FORM,
      house_rules: RULES,
      images: photos(
        "wembley-balcony-apartment",
        "17L 18L 19L 16L 20D 21K 22K 23K 24K 25BAL 26BAL 29B 30B 31B 27BA 28BA 32H 33H 01KD 02KD 03KD 04DD 05X 06X 07L 08L 09X 10X 11W 12X 13BD 14BD 15BD",
      ),
    },
  },
  // Property 4
  {
    rate: 10000,
    cleaning: 4500,
    listing: {
      slug: "hounslow-central-apartment",
      name: "Hounslow Central Apartment",
      property_type: "One-bedroom apartment",
      featured: 0,
      summary:
        "Luxury, spacious and modern apartment near Heathrow, a 4-minute walk from Hounslow Central Tube. Sleeps 6 with 2 sofa beds, free secure gated parking with EV charger, and 2 lifts to the apartment.",
      description: p([
        "Luxury, spacious and modern Hounslow apartment near Heathrow Airport. Hounslow Central Tube is 4 minutes' walk, with Heathrow 15 to 20 minutes by Tube or 10 to 15 minutes by car. Free secure gated parking on-site with EV charger, exclusively for residents, with 2 lifts directly to the apartment. Sleeps 6 comfortably with 2 sofa beds, 65\" Smart TV, dedicated workspace, coffee machine and air fryer. Family-friendly, comfortable and ideal for airport stays, business trips or exploring Central London with ease.",
        "## The space",
        "The apartment features a comfortable bedroom with a double bed, wardrobe and additional cupboard space for your belongings. The bedroom also includes a dedicated workspace with a desk and chair, along with a wall-mounted 55\" Smart TV, making it ideal for guests who need to work during their stay.",
        "The living room provides a comfortable and relaxing space, featuring two sofa beds and a 65\" Smart TV. A dining table with chairs is also available, providing a convenient space to enjoy meals together or work during your stay. Plenty of throws and cushions are provided throughout the apartment to create a cosy, comfortable and luxurious atmosphere.",
        "The fully equipped kitchen has everything you need for both short and long stays, including a coffee machine, air fryer, oven, fridge, microwave, kettle, toaster and all the essential kitchen equipment needed to prepare meals with ease.",
        "Designed with comfort, practicality and a touch of luxury throughout, the apartment offers a welcoming home away from home for couples, families, business travellers or small groups.",
        PRIVATE_ACCESS,
      ]),
      town: "Hounslow",
      latitude: 51.4708,
      longitude: -0.3672,
      area_info:
        "Hounslow Central Tube station (Piccadilly line) is a 4-minute walk, with Heathrow Airport 15 to 20 minutes by Tube or 10 to 15 minutes by car, and a direct line into Central London.",
      bedrooms: 1,
      beds: 3,
      bathrooms: 1,
      max_guests: 6,
      amenities: ["wifi", "kitchen", "heating", "linen", "self_check_in", "tv", "workspace", "parking", "ev_charger", "lift", "near_tube", "coffee_machine"],
      check_in_info: CHECK_IN_FORM,
      house_rules: RULES,
      images: photos(
        "hounslow-central-apartment",
        "22L 23L 21L 24L 25L 26D 27K 28K 29K 30L 16B 17B 18B 31B 19BA 20BA 14KD 15KD 09DD 04W 10X 11L 12L 01BD 02BD 03BD 05X 06X 07BAD 08X 13X",
      ),
    },
  },
  // Property 5
  {
    rate: 16500,
    cleaning: 6500,
    listing: {
      slug: "wembley-stadium-view-apartment",
      name: "Wembley Stadium View Apartment",
      property_type: "Two-bedroom apartment",
      featured: 1,
      summary:
        "Luxury two-bedroom apartment sleeping up to 8, with a full view of Wembley from the private balcony. Pool and table tennis dining table, Pac-Man arcade, 75\" Smart TV with soundbar and LED lights, and a 10-minute walk to the stadium.",
      description: p([
        "Luxury, spacious 2-bedroom apartment sleeping up to 8. 10-minute walk to Wembley Stadium with fast links to Central London. Enjoy a full view of Wembley from your private balcony with egg chair and outdoor seating. Perfect for families, groups, business trips and long stays, featuring a pool/table tennis dining table, Pac-Man arcade, 75\" Smart TV with soundbar and LED lights, workspace, Nespresso machine, air fryer, fast WiFi, fully equipped kitchen, plus shops, restaurants and transport nearby.",
        "## The space",
        "Welcome to this spacious and luxurious 2-bedroom apartment, thoughtfully designed to provide a comfortable home away from home for families, groups, business travellers and longer stays.",
        "The apartment features two comfortable bedrooms, each with a double bed, alongside two large sofa beds in the living area, allowing the property to comfortably sleep up to 8 guests. Bedding is provided for the sofa beds, ensuring everyone has a comfortable stay.",
        "The bright and spacious living area is perfect for relaxing, socialising and creating memories. Enjoy a premium entertainment experience with a 75-inch Smart TV, soundbar and motion sensor LED lighting surrounding the TV for an immersive atmosphere. For some added fun, guests can enjoy the retro Pac-Man arcade machine, which includes a variety of classic games.",
        "The dining area features a large dining table that cleverly transforms into a pool table and table tennis table, providing the perfect space for meals, entertainment and friendly competition.",
        "The private balcony offers a relaxing outdoor space with an egg chair and table seating, perfect for enjoying your morning coffee, evening drinks or simply unwinding after a busy day.",
        "If you're travelling with children, the property includes a travel cot (with mattress and bedding), a high chair, and a selection of toys for younger children to help make your stay more comfortable.",
        "For guests working remotely, the apartment includes a dedicated workspace and fast WiFi, making it ideal for business trips or those needing to work comfortably during their stay.",
        "The fully equipped kitchen has everything you need to prepare meals, including an oven, hob, microwave, kettle, toaster, air fryer, Nespresso coffee machine, a selection of teas, cookware, crockery and utensils. A washing machine is also available for your convenience.",
        "Additional amenities include an iron and ironing board, hairdryer, fresh towels, bed linen and several fans throughout the apartment to keep guests comfortable.",
        "## Guest access",
        "The entire apartment is yours to enjoy privately throughout your stay. Make yourself comfortable, relax and take full advantage of all the spaces and amenities available, creating a home away from home at your own pace.",
      ]),
      town: "Wembley",
      latitude: 51.5578,
      longitude: -0.2905,
      area_info: WEMBLEY_AREA,
      bedrooms: 2,
      beds: 4,
      bathrooms: 1,
      max_guests: 8,
      amenities: ["wifi", "kitchen", "washer", "heating", "linen", "self_check_in", "tv", "workspace", "balcony", "near_tube", "games", "coffee_machine", "cot", "high_chair"],
      check_in_info: CHECK_IN_FORM,
      house_rules: `${HOUSE_RULES}\n${BALCONY_RULES}`,
      images: photos(
        "wembley-stadium-view-apartment",
        "32BAL 25L 26L 24L 27D 28D 29D 30D 31K 38P 42P 21G 33BAL 34B 35B 37B 36W 39B2 40B2 41B2 43BA 44BA 45BA 46H 47H 48H 01BAL 22G 23G 16P 17P 02DD 03KD 04KD 05KD 06KD 07L 08L 09L 10L 11X 12BD 13BD 14W 15BD 18BAD 19BAD 20BAD",
      ),
    },
  },
  // Property 6
  {
    rate: 10000,
    cleaning: 4500,
    listing: {
      slug: "harrow-balcony-apartment",
      name: "Harrow Balcony Apartment",
      property_type: "One-bedroom apartment",
      featured: 0,
      summary:
        "Stylish one-bedroom apartment in Harrow, near Wembley Stadium and Wembley Arena. Sleeps 4 with a sofa bed, private balcony with egg chair, 2 Smart TVs and a lift-top coffee table for dining or working.",
      description: p([
        "Stylish 1-bedroom Harrow, London apartment near Wembley Stadium, Wembley Arena and excellent transport links to Central London. Perfect for couples, families, small groups and business travellers, this modern home sleeps 4 with a comfortable bedroom, sofa bed, fast WiFi, fully equipped kitchen, 2 Smart TVs, egg chair and lift-top coffee table ideal for dining or working remotely. Enjoy a spacious living area, perfect after exploring London, events, shopping or longer stays near Wembley.",
        "## The space",
        "Guests can enjoy a stylish and spacious 1-bedroom apartment thoughtfully designed for comfort, convenience and a home-away-from-home experience.",
        "The modern open-plan living area features high-quality navy furniture, comfortable seating and a sofa that converts into a bed, with bedding provided for your convenience. The lift-top coffee table is perfect for dining, relaxing or working remotely. Step outside onto the private balcony with comfortable seating and an egg chair, ideal for enjoying your morning coffee or unwinding after exploring London.",
        "The fully equipped kitchen has everything you need, including a coffee machine, double-compartment air fryer, kettle, toaster, microwave, oven, fridge, freezer, cookware and dining essentials. The dining area includes a table with comfortable bench seating, perfect for enjoying meals together.",
        "The bedroom provides a comfortable place to relax, with fresh bedding, towels and spare sheets available. Guests can also enjoy Smart TVs, fast WiFi and fans throughout the apartment for added comfort.",
        "Every detail has been carefully considered to create a relaxing, practical and enjoyable stay.",
        PRIVATE_ACCESS,
        NO_PARKING,
      ]),
      town: "Harrow",
      latitude: 51.5806,
      longitude: -0.342,
      area_info:
        "Close to Wembley Stadium and OVO Arena Wembley, with excellent transport links into Central London and plenty of shopping nearby.",
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      max_guests: 4,
      amenities: ["wifi", "kitchen", "heating", "linen", "self_check_in", "tv", "workspace", "balcony", "coffee_machine"],
      check_in_info: CHECK_IN_FORM,
      house_rules: RULES,
      images: photos(
        "harrow-balcony-apartment",
        "19L 20L 21L 25L 22D 26K 27K 28K 23BAL 24BAL 30B 31B 32B 33BA 34BA 29H 35H 36H 37H 01KD 02KD 03KD 04KD 05X 06X 07L 08L 09L 10BD 11BD 12BD 13X 14X 15BAD 16X 17X 18X",
      ),
    },
  },
  // Property 7
  {
    rate: 10500,
    cleaning: 4500,
    listing: {
      slug: "cockfosters-games-room-apartment",
      name: "Cockfosters Games Room Apartment",
      property_type: "One-bedroom apartment",
      featured: 1,
      summary:
        "Modern one-bedroom apartment in peaceful Cockfosters, 5 minutes' walk from the Piccadilly line. Sleeps 4, with a dining table that turns into a snooker and table tennis table, a 75\" Smart TV, rooftop terrace and free parking nearby.",
      description: p([
        "Modern apartment in peaceful Cockfosters, North London, a 5-minute walk to the Piccadilly Line with direct access to Central London. Sleeps 4 with a large sofa bed, fast WiFi, self check-in, free parking on a nearby side road, rooftop terrace, 75\" Smart TV and a fully equipped kitchen with a coffee machine and air fryer. Enjoy a unique dining/snooker/table tennis table plus a lift-top coffee table for dining or remote working. Perfect for couples, families, business trips and London getaways.",
        "## The space",
        "Welcome to our stylish and spacious one-bedroom apartment in peaceful Cockfosters, North London. Perfect for couples, families, friends, business travellers and longer stays, this modern home comfortably sleeps up to 4 guests while offering the perfect balance of luxury, comfort and convenience.",
        "Designed with high-quality rustic furnishings and a bright, open layout, the apartment features a comfortable double bedroom alongside a large sofa that easily converts into a sofa bed, with fresh hotel-quality linen, spare bedding and extra towels provided for your stay.",
        "Relax in the cosy living area with a stunning 75-inch Smart TV, or unwind in the bedroom with its own Smart TV, giving everyone space to enjoy their favourite shows. The fully equipped kitchen includes everything needed for home cooking, including an oven, hob, microwave, fridge freezer, coffee machine, air fryer, kettle, toaster and all essential cookware and utensils.",
        "A standout feature is the versatile entertainment space, where the dining table transforms into a snooker table and table tennis table, while the lift-top coffee table doubles as a dining table or comfortable workspace, perfect for remote working or family meals.",
        "Step outside onto the private rooftop terrace, ideal for your morning coffee or relaxing after a day exploring London. Families are well catered for with a highchair provided, generous living space and a welcoming layout that makes travelling with children easy.",
        "You'll also benefit from fast WiFi, self check-in, and free parking on nearby residential side roads with no permit required.",
        "## Guest access",
        "Guests have exclusive access to the entire apartment throughout their stay, including the bedroom, bathroom, living area, fully equipped kitchen, private rooftop terrace and all amenities, including the snooker/table tennis table, Smart TVs and high-speed WiFi. The property is completely private with self check-in.",
        "## Good to know",
        "We're always happy to help with any questions before or during your stay. Our team is just a message away, and if anything urgent arises, a member of our team can attend the property.",
      ]),
      town: "Cockfosters",
      latitude: 51.6535,
      longitude: -0.1525,
      area_info: COCKFOSTERS_AREA,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      max_guests: 4,
      amenities: ["wifi", "kitchen", "heating", "linen", "self_check_in", "tv", "workspace", "parking", "near_tube", "roof_terrace", "games", "coffee_machine", "high_chair"],
      check_in_info: CHECK_IN_FORM,
      house_rules: RULES,
      images: photos(
        "cockfosters-games-room-apartment",
        "23L 22L 24L 25L 27P 28P 29D 30D 26K 16B 17B 15B 18B 19BA 20BA 21BA 12P 13P 14P 10L 11L 08X 09X 01BD 02BD 03BD 05BD 04X 06BAD 07BAD",
      ),
    },
  },
  // Property 8
  {
    rate: 14000,
    cleaning: 5500,
    listing: {
      slug: "wembley-high-rise-apartment",
      name: "Wembley High-Rise Apartment",
      property_type: "Two-bedroom apartment",
      featured: 1,
      summary:
        "Stylish new-build high-rise apartment with stunning Wembley Stadium views from the spacious balcony. Sleeps 6, with an en-suite, sofa bed, Smart TV, lift-top coffee table and station links within a 10-minute walk.",
      description: p([
        "Welcome to Click'N'Rest: Click. Stay. Rest. A stylish, homely new-build on a high-rise with stunning Wembley Stadium views from the spacious balcony. Sleeps 6, perfect for families, couples or business stays, with high-speed WiFi and a lift-top coffee table that doubles as a laptop workspace or comfy dining spot. Enjoy a Smart TV, sofa bed, en-suite, coffee machine, double air fryer and more. Station and bus links are within a 10-minute walk for easy access to Central London.",
        PRIVATE_ACCESS,
        NO_PARKING,
      ]),
      town: "Wembley",
      latitude: 51.5598,
      longitude: -0.2830,
      area_info: WEMBLEY_AREA,
      bedrooms: 2, // CHECK: from the photos (two bedrooms, two bathrooms)
      beds: 3,
      bathrooms: 2,
      max_guests: 6,
      amenities: ["wifi", "kitchen", "heating", "linen", "self_check_in", "tv", "workspace", "balcony", "lift", "near_tube", "coffee_machine"],
      check_in_info: CHECK_IN_FORM,
      house_rules: RULES,
      images: photos(
        "wembley-high-rise-apartment",
        "25L 26L 27L 28L 23D 24D 30D 29K 31BAL 32BAL 11V 10BAL 33B 34B 35B 15BA 36BA 37B2 38B2 39B2 40BA 41BA 42BA 43H 44H 45H 01L 02L 03L 04DD 05KD 06KD 07KD 08X 09X 12BD 13BD 14BD 16BAD 17BAD 18BAD 19BD 20BD 21BD 22BD",
      ),
    },
  },
  // Property 9
  {
    rate: 14500,
    cleaning: 6000,
    listing: {
      slug: "wembley-family-apartment",
      name: "Wembley Family Apartment",
      property_type: "Two-bedroom apartment",
      featured: 1,
      summary:
        "Stylish two-bedroom, two-bathroom apartment near Wembley Stadium and Wembley Arena. Three beds plus a sofa bed, brand-new furniture, a balcony with egg chair, Smart TVs and a lift-top coffee table for dining or working.",
      description: p([
        "Stylish two-bedroom London apartment, perfectly located near Wembley Stadium, Wembley Arena and excellent transport links to Central London. Ideal for families, couples, groups and business travellers, this modern home offers comfortable bedrooms, fast WiFi, a fully equipped kitchen, Smart TVs and a relaxing egg chair. Unwind after exploring London or attending events with a spacious living area designed for comfort. A perfect base for Wembley events, sightseeing, shopping and extended stays.",
        "## The space",
        "Welcome to our stylish and modern two-bedroom apartment, thoughtfully designed to provide a comfortable, clean and relaxing stay in London. Set in a quiet location, the apartment offers a peaceful retreat after a busy day exploring the city, attending events or travelling for work.",
        "Perfect for groups and families, two comfortable bedrooms, three beds and two bathrooms make sharing the apartment easy. The apartment features brand new, high-quality furniture throughout, creating a welcoming home-from-home environment. The spacious open-plan living area includes a comfortable sofa, sofa bed, Smart TV and a unique lift-top coffee table that can be used as a dining table while enjoying your favourite shows, or raised as a convenient laptop workspace for guests working remotely.",
        "The fully equipped kitchen includes an oven, fridge/freezer, microwave, two-door air fryer, coffee machine and a great selection of teas, providing everything needed for a comfortable stay. Guests can also enjoy thoughtful home comforts including high-speed WiFi, an iron, privacy curtains, fans for warmer days and a highchair for families travelling with young children.",
        "With two comfortable bedrooms, plenty of space and modern amenities throughout, this apartment is ideal for short stays, longer visits, family holidays, contractors, business trips and guests looking for a peaceful London base.",
        "Located close to Wembley Stadium, Wembley Arena and excellent transport links into Central London, it is perfectly placed for sightseeing, shopping, concerts, sporting events and exploring the capital.",
        PRIVATE_ACCESS,
        NO_PARKING,
      ]),
      town: "Wembley",
      latitude: 51.5560,
      longitude: -0.2870,
      area_info: WEMBLEY_AREA,
      bedrooms: 2,
      beds: 4,
      bathrooms: 2,
      max_guests: 7, // CHECK: not stated; 3 beds + sofa bed
      amenities: ["wifi", "kitchen", "heating", "linen", "self_check_in", "tv", "workspace", "balcony", "near_tube", "coffee_machine", "high_chair"],
      check_in_info: CHECK_IN_FORM,
      house_rules: RULES,
      images: photos(
        "wembley-family-apartment",
        "33L 34L 35L 31L 32L 29D 30D 38K 36BAL 37BAL 10BAL 26B 27B 28B 42B2 43B2 44B2 39BA 40BA 41BA 45BA 46BA 23BA 47H 48H 49H 04L 05L 06L 07X 08X 09X 11DD 12KD 13KD 14KD 01BD 02BD 03BD 19BD 20BD 21BD 22BD 15BAD 16BAD 24BAD 17X 18X 25X",
      ),
    },
  },
];
