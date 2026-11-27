import { getDb } from "./db";
import { CANCELLATION, HOME_COPY } from "../content/launch";

export type SiteSettings = {
  brandName: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  ownerName: string;
  ownerNotificationEmail: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactHours: string;
  instagramUrl: string;
  companyName: string; // legal entity, shown in the footer (Companies Act disclosure)
  companyNumber: string;
  registeredOffice: string;
};

export type RegionalSettings = {
  currency: string; // ISO 4217, e.g. GBP
  locale: string; // BCP 47, e.g. en-GB
  timeZone: string; // IANA, e.g. Europe/London
};

export type TaxSettings = {
  name: string; // e.g. "VAT"
  ratePercent: number; // e.g. 20
  mode: "included" | "added" | "none";
};

export type BookingSettings = {
  holdMinutes: number;
  maxAdvanceMonths: number;
  fullRefundDays: number;
  partialRefundDays: number;
  partialRefundPercent: number;
  cancellationSummary: string;
};

export type PaymentSettings = {
  bankTransferEnabled: boolean;
  bankName: string;
  accountName: string;
  sortCode: string;
  accountNumber: string;
  transferHoldHours: number; // how long dates are held while a transfer arrives
  transferNote: string; // extra line shown with the bank details
};

export type HomeContent = {
  heroEyebrow: string;
  heroHeadline: string;
  heroIntro: string;
  heroImage: string; // media key
  introTitle: string;
  introBody: string;
  introImage: string; // media key
  benefitsTitle: string;
  benefits: { title: string; body: string }[];
  experiencesTitle: string;
  experiencesIntro: string;
  experiences: { title: string; body: string; image: string }[];
  ctaTitle: string;
  ctaBody: string;
};

export const DEFAULTS = {
  site: {
    brandName: "Click'N'Rest",
    tagline: "Click. Stay. Rest.",
    metaTitle: "Click'N'Rest · Apartments across north and west London",
    metaDescription: "Click. Stay. Rest. Self-catering apartments in Wembley, Cockfosters, Harrow and Hounslow, booked directly with no platform fees.",
    ownerName: "Click'N'Rest",
    ownerNotificationEmail: "Inquiries@clicknrest.com",
    contactEmail: "Inquiries@clicknrest.com",
    contactPhone: "07385 772508",
    contactAddress: "", // Run remotely: no public address (Hannah, 2026-11-17)
    contactHours: "Every day, 9am to 9pm",
    instagramUrl: "",
    companyName: "Click N Rest Ltd",
    companyNumber: "17265682",
    registeredOffice: "248 Staple Lodge Road, Birmingham, B31 3ER, England",
  } satisfies SiteSettings,
  regional: { currency: "GBP", locale: "en-GB", timeZone: "Europe/London" } satisfies RegionalSettings,
  tax: { name: "VAT", ratePercent: 20, mode: "included" } satisfies TaxSettings,
  booking: {
    holdMinutes: 30,
    maxAdvanceMonths: 18,
    ...CANCELLATION,
  } satisfies BookingSettings,
  payments: {
    bankTransferEnabled: false,
    bankName: "Your bank (placeholder)",
    accountName: "Click'N'Rest (placeholder)",
    sortCode: "00-00-00",
    accountNumber: "00000000",
    transferHoldHours: 24,
    transferNote: "",
  } satisfies PaymentSettings,
  home: {
    heroEyebrow: "Click. Stay. Rest.",
    heroHeadline: "Comfortable London apartments, booked in a few clicks",
    heroIntro: HOME_COPY.heroIntro,
    heroImage: "wembley-stadium-view-apartment-32",
    introTitle: "Hosted by us, from booking to checkout",
    introBody: HOME_COPY.introBody,
    introImage: "wembley-high-rise-apartment-25",
    benefitsTitle: "Why book direct",
    benefits: [
      { title: "No platform booking fees", body: "The price you see is the price you pay, with no service fee added at checkout." },
      { title: "Talk to your host", body: "Questions answered directly by the people who look after each apartment." },
      { title: "Clear terms", body: "Straightforward cancellation terms, shown before you pay." },
      { title: "Secure payment", body: "Card payments handled by a trusted payment provider. We never store card details." },
    ],
    experiencesTitle: "Around our apartments",
    experiencesIntro: HOME_COPY.experiencesIntro,
    experiences: [
      { title: "Events at Wembley", body: HOME_COPY.experienceBodies[0], image: "wembley-high-rise-apartment-11" },
      { title: "Green space", body: HOME_COPY.experienceBodies[1], image: "wembley-balcony-apartment-25" },
      { title: "Easy connections", body: HOME_COPY.experienceBodies[2], image: "wembley-family-apartment-37" },
    ],
    ctaTitle: "Click. Stay. Rest.",
    ctaBody: "Browse all nine apartments, check live availability and book in a few minutes.",
  } satisfies HomeContent,
};

type SettingsMap = {
  site: SiteSettings;
  regional: RegionalSettings;
  tax: TaxSettings;
  booking: BookingSettings;
  payments: PaymentSettings;
  home: HomeContent;
};

export function getSetting<K extends keyof SettingsMap>(key: K): SettingsMap[K] {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  const defaults = DEFAULTS[key] as SettingsMap[K];
  if (!row) return defaults;
  try {
    return { ...defaults, ...(JSON.parse(row.value) as Partial<SettingsMap[K]>) };
  } catch {
    return defaults;
  }
}

export function setSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]): void {
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, JSON.stringify(value));
}

export function getAllSettings() {
  return {
    site: getSetting("site"),
    regional: getSetting("regional"),
    tax: getSetting("tax"),
    booking: getSetting("booking"),
    payments: getSetting("payments"),
  };
}

/** True while the demo placeholder account is still in place. */
export function bankDetailsArePlaceholders(p: PaymentSettings = getSetting("payments")): boolean {
  return p.sortCode.trim() === "00-00-00" || p.accountNumber.trim() === "00000000";
}

/** Bank transfer is offered only when it is switched on and the account details are filled in. */
export function bankTransferAvailable(p: PaymentSettings = getSetting("payments")): boolean {
  return p.bankTransferEnabled && !!p.accountName.trim() && !!p.sortCode.trim() && !!p.accountNumber.trim();
}
