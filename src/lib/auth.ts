import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "./db";
import { sessionSecret, verifyPassword, hashPassword, sha256 } from "./tokens";

const ADMIN_COOKIE = "fs_admin";
const GUEST_COOKIE = "fs_guest";
const secure = process.env.NODE_ENV === "production" && !process.env.SITE_URL?.startsWith("http://");

export type AdminUser = { id: number; email: string; name: string; must_change_password: number };

// ---------------------------------------------------------------- rate limiting

const attempts = new Map<string, { count: number; first: number }>();
/** Simple in-memory limiter: `max` attempts per `windowMs` per key. */
export function rateLimit(key: string, max = 8, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.first > windowMs) {
    attempts.set(key, { count: 1, first: now });
    return true;
  }
  a.count++;
  return a.count <= max;
}

// ---------------------------------------------------------------- admin sessions

export async function signInAdmin(email: string, password: string): Promise<AdminUser | null> {
  const row = getDb().prepare("SELECT * FROM admin_users WHERE email = ?").get(email.trim().toLowerCase()) as
    | (AdminUser & { password_hash: string })
    | undefined;
  // Always run a hash comparison so response time doesn't reveal valid emails.
  const ok = row ? verifyPassword(password, row.password_hash) : (verifyPassword(password, "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "=="), false);
  if (!row || !ok) return null;
  const token = await new SignJWT({ sub: String(row.id), role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionSecret());
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 7 * 86400 });
  return { id: row.id, email: row.email, name: row.name, must_change_password: row.must_change_password };
}

export async function signOutAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    if (payload.role !== "owner") return null;
    const row = getDb().prepare("SELECT id, email, name, must_change_password FROM admin_users WHERE id = ?").get(Number(payload.sub)) as AdminUser | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

// ---------------------------------------------------------------- guest access

/**
 * Guests see their booking either through the private link in their
 * confirmation email (?token=...) or after looking it up with reference +
 * email, which sets this short-lived signed cookie.
 */
export async function grantGuestAccess(reference: string) {
  const jar = await cookies();
  let refs: string[] = [];
  const existing = jar.get(GUEST_COOKIE)?.value;
  if (existing) {
    try {
      const { payload } = await jwtVerify(existing, sessionSecret(), { algorithms: ["HS256"] });
      refs = Array.isArray(payload.refs) ? (payload.refs as string[]) : [];
    } catch {}
  }
  refs = Array.from(new Set([reference, ...refs])).slice(0, 10);
  const token = await new SignJWT({ refs }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("2d").sign(sessionSecret());
  jar.set(GUEST_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 2 * 86400 });
}

export async function hasGuestAccess(reference: string): Promise<boolean> {
  const value = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!value) return false;
  try {
    const { payload } = await jwtVerify(value, sessionSecret(), { algorithms: ["HS256"] });
    return Array.isArray(payload.refs) && (payload.refs as string[]).includes(reference);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- password reset

/** Ties a reset link to the current password, so it stops working once the password changes. */
const pwStamp = (hash: string) => sha256("reset:" + hash).slice(0, 16);

export async function createPasswordResetToken(email: string): Promise<{ email: string; token: string } | null> {
  const row = getDb().prepare("SELECT id, email, password_hash FROM admin_users WHERE email = ?").get(email.trim().toLowerCase()) as
    | { id: number; email: string; password_hash: string }
    | undefined;
  if (!row) return null;
  const token = await new SignJWT({ sub: String(row.id), purpose: "reset", pw: pwStamp(row.password_hash) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(sessionSecret());
  return { email: row.email, token };
}

/** Returns the admin id the reset token belongs to, or null if invalid, expired or already used. */
export async function checkPasswordResetToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    if (payload.purpose !== "reset") return null;
    const row = getDb().prepare("SELECT password_hash FROM admin_users WHERE id = ?").get(Number(payload.sub)) as { password_hash: string } | undefined;
    if (!row || payload.pw !== pwStamp(row.password_hash)) return null;
    return Number(payload.sub);
  } catch {
    return null;
  }
}

export function setAdminPassword(id: number, password: string) {
  getDb().prepare("UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(hashPassword(password), id);
}
