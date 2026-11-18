/**
 * Runs once when the server starts. Keeps Smoobu prices, minimum stays and
 * availability fresh by syncing every 10 minutes (only when Smoobu keys are set).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.SMOOBU_API_KEY || !process.env.SMOOBU_API_SECRET) return;
  const { syncAll } = await import("./lib/smoobu");
  const g = globalThis as typeof globalThis & { __smoobuTimer?: ReturnType<typeof setInterval> };
  if (g.__smoobuTimer) return;
  const minutes = Math.max(2, Number(process.env.SMOOBU_SYNC_MINUTES || 10));
  setTimeout(() => void syncAll(), 5_000);
  g.__smoobuTimer = setInterval(() => void syncAll(), minutes * 60_000);
}
