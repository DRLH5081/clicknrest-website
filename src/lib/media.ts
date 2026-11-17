import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { DATA_DIR, getDb } from "./db";

/**
 * Uploaded images are resized once into WebP variants and served from
 * /media/<key>/<size>. Pages use srcset so phones download small files.
 */
export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR || path.join(DATA_DIR, "uploads"));
export const SIZES = { sm: 640, md: 1280, lg: 2000 } as const;
export type MediaSize = keyof typeof SIZES;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function storeImage(input: Buffer, originalName = "", key?: string): Promise<{ key: string; width: number; height: number }> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new Error("Image is larger than 15 MB.");
  const meta = await sharp(input).metadata();
  if (!meta.format || !["jpeg", "png", "webp", "avif", "heif", "tiff", "gif"].includes(meta.format)) {
    throw new Error("Please upload a JPEG, PNG, WebP or AVIF image.");
  }
  const mediaKey = key || `${Date.now().toString(36)}-${crypto.randomBytes(5).toString("hex")}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const base = sharp(input).rotate();
  let width = 0;
  let height = 0;
  for (const [size, w] of Object.entries(SIZES)) {
    const out = await base.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
    fs.writeFileSync(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, `${mediaKey}-${size}.webp`), out.data);
    if (size === "lg") {
      width = out.info.width;
      height = out.info.height;
    }
  }
  getDb()
    .prepare("INSERT INTO media (key, width, height, original_name) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET width = excluded.width, height = excluded.height")
    .run(mediaKey, width, height, originalName);
  return { key: mediaKey, width, height };
}

export function mediaPath(key: string, size: MediaSize): string | null {
  if (!/^[a-z0-9-]+$/i.test(key)) return null;
  return path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, `${key}-${size}.webp`);
}

export function deleteMediaFiles(key: string) {
  const inUse =
    (getDb().prepare("SELECT COUNT(*) c FROM property_images WHERE media_key = ?").get(key) as { c: number }).c > 0;
  if (inUse) return;
  for (const size of Object.keys(SIZES)) {
    const p = mediaPath(key, size as MediaSize);
    if (p) fs.rmSync(p, { force: true });
  }
  getDb().prepare("DELETE FROM media WHERE key = ?").run(key);
}

export function listMedia(): { key: string; width: number; height: number; original_name: string }[] {
  return getDb().prepare("SELECT key, width, height, original_name FROM media ORDER BY created_at DESC").all() as never;
}
