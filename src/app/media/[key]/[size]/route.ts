import fs from "node:fs";
import { mediaPath, SIZES, type MediaSize } from "@/lib/media";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string; size: string }> }) {
  const { key, size } = await ctx.params;
  if (!(size in SIZES)) return new Response("Not found", { status: 404 });
  const file = mediaPath(key, size as MediaSize);
  if (!file || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const data = fs.readFileSync(file);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.byteLength),
      // Keys are unique per upload, so files never change.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
