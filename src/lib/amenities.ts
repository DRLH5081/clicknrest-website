export type Amenity = { key: string; label: string; group: string };

/** Add to this list to make new amenities selectable in the admin. */
export const AMENITIES: Amenity[] = [
  { key: "wifi", label: "Fast wifi", group: "Essentials" },
  { key: "kitchen", label: "Fully equipped kitchen", group: "Essentials" },
  { key: "washer", label: "Washing machine", group: "Essentials" },
  { key: "dryer", label: "Tumble dryer", group: "Essentials" },
  { key: "heating", label: "Central heating", group: "Essentials" },
  { key: "linen", label: "Linen and towels", group: "Essentials" },
  { key: "workspace", label: "Dedicated workspace", group: "Essentials" },
  { key: "self_check_in", label: "Self check-in (lockbox)", group: "Essentials" },
  { key: "concierge", label: "Concierge key collection", group: "Essentials" },
  { key: "air_con", label: "Air conditioning", group: "Comfort" },
  { key: "parking", label: "Free parking", group: "Getting here" },
  { key: "ev_charger", label: "EV charger", group: "Getting here" },
  { key: "near_tube", label: "Near a Tube station", group: "Getting here" },
  { key: "lift", label: "Lift", group: "Accessibility" },
  { key: "step_free", label: "Step-free entrance", group: "Accessibility" },
  { key: "ground_floor_bedroom", label: "Ground-floor bedroom", group: "Accessibility" },
  { key: "fireplace", label: "Log burner or fireplace", group: "Comfort" },
  { key: "hot_tub", label: "Hot tub", group: "Comfort" },
  { key: "bath", label: "Freestanding bath", group: "Comfort" },
  { key: "tv", label: "Smart TV", group: "Comfort" },
  { key: "garden", label: "Private garden", group: "Outdoors" },
  { key: "balcony", label: "Balcony", group: "Outdoors" },
  { key: "bbq", label: "Barbecue", group: "Outdoors" },
  { key: "sea_view", label: "Sea view", group: "Outdoors" },
  { key: "lake_view", label: "Lake or mountain view", group: "Outdoors" },
  { key: "beach_nearby", label: "Beach within walking distance", group: "Outdoors" },
  { key: "pets", label: "Dogs welcome", group: "Family & pets" },
  { key: "cot", label: "Travel cot", group: "Family & pets" },
  { key: "dishwasher", label: "Dishwasher", group: "Essentials" },
  { key: "coffee_machine", label: "Coffee machine", group: "Essentials" },
  { key: "games", label: "Games (arcade or pool table)", group: "Comfort" },
  { key: "roof_terrace", label: "Rooftop terrace", group: "Outdoors" },
  { key: "high_chair", label: "High chair", group: "Family & pets" },
];

export const AMENITY_MAP = new Map(AMENITIES.map((a) => [a.key, a]));

/** Amenities offered as quick filters on the listings page. */
export const FILTER_AMENITIES = ["parking", "near_tube", "self_check_in", "workspace", "washer", "balcony", "garden", "lift", "step_free"];
