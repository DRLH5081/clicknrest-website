/** Money is stored in minor units (pence, cents) as integers. */
export function formatMoney(minor: number, currency = "GBP", locale = "en-GB", opts: { whole?: boolean } = {}): string {
  const value = minor / 100;
  const whole = opts.whole ?? false;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Parse a user-entered amount like "125", "125.50" or "£1,250" into minor units. */
export function parseMoney(input: unknown): number | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const s = String(input).replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function minorToInput(minor: number | null | undefined): string {
  if (minor == null) return "";
  return (minor / 100).toFixed(2).replace(/\.00$/, "");
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
