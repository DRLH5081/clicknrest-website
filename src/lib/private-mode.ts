import { getDb } from "./db";
import { getAdmin } from "./auth";

const KEY = "site_private";

/** Private mode: the public sees a "Coming soon" page; a signed-in owner sees the full site. On by default. */
export function isSitePrivate(): boolean {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(KEY) as { value: string } | undefined;
  return row ? row.value !== "false" : true;
}

export function setSitePrivate(on: boolean) {
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(KEY, on ? "true" : "false");
}

/** True when this visitor should be kept out (site private and not signed in as the owner). */
export async function blockedByPrivateMode(): Promise<boolean> {
  if (!isSitePrivate()) return false;
  return !(await getAdmin());
}
