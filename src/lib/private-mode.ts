import { cookies } from "next/headers";
import { getDb } from "./db";
import { getAdmin } from "./auth";
import { randomToken, safeEqual } from "./tokens";

const KEY = "site_private";
const PREVIEW_KEY = "site_preview_token";
export const PREVIEW_COOKIE = "cnr_preview";

const getRaw = (key: string) => (getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined)?.value;
const setRaw = (key: string, value: string) =>
  getDb().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);

/** Private mode: the public sees a "Coming soon" page; a signed-in owner sees the full site. On by default. */
export function isSitePrivate(): boolean {
  const v = getRaw(KEY);
  return v ? v !== "false" : true;
}

export function setSitePrivate(on: boolean) {
  setRaw(KEY, on ? "true" : "false");
}

/** Secret for the shareable preview link. Created on first use; resetting it cuts off everyone who had the old link. */
export function previewToken(): string {
  let t = getRaw(PREVIEW_KEY);
  if (!t) {
    t = randomToken(18);
    setRaw(PREVIEW_KEY, t);
  }
  return t;
}

export function resetPreviewToken(): string {
  const t = randomToken(18);
  setRaw(PREVIEW_KEY, t);
  return t;
}

export function isValidPreviewToken(t: string | null | undefined): boolean {
  const cur = getRaw(PREVIEW_KEY);
  return !!(t && cur && safeEqual(t, cur));
}

/** A visitor who opened the preview link may look around (but not book) while the site is private. */
export async function hasPreviewAccess(): Promise<boolean> {
  return isValidPreviewToken((await cookies()).get(PREVIEW_COOKIE)?.value);
}

/** True when this visitor should be kept out (site private, not the owner, and not holding a valid preview link). */
export async function blockedByPrivateMode(opts: { allowPreview?: boolean } = { allowPreview: true }): Promise<boolean> {
  if (!isSitePrivate()) return false;
  if (await getAdmin()) return false;
  return !(opts.allowPreview && (await hasPreviewAccess()));
}
