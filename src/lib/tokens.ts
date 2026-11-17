import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function bookingReference(): string {
  const bytes = crypto.randomBytes(6);
  let s = "";
  for (const b of bytes) s += REF_ALPHABET[b % REF_ALPHABET.length];
  return `CNR-${s}`;
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Password hashing with scrypt (built into Node, no native add-ons). */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, n, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt") return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = crypto.scryptSync(password, salt, expected.length, { N: Number(n), r: 8, p: 1 });
  return crypto.timingSafeEqual(actual, expected);
}

let cachedSecret: Uint8Array | null = null;

/**
 * Secret for signing session cookies. Set SESSION_SECRET in production; for
 * local demo use a random secret is generated once and kept in the data folder.
 */
export function sessionSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  let secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    const file = path.join(DATA_DIR, ".session-secret");
    try {
      secret = fs.readFileSync(file, "utf8").trim();
    } catch {
      secret = randomToken(48);
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(file, secret, { mode: 0o600 });
    }
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}
