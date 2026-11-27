import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-url";
import { isValidPreviewToken, PREVIEW_COOKIE } from "@/lib/private-mode";
import { rateLimit } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";

/** Shareable preview link: /preview?key=… lets someone look around the private site for 30 days. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  const ip = await clientIp();
  const res = NextResponse.redirect(new URL("/", siteUrl()));
  if (rateLimit(`preview:${ip}`, 20) && isValidPreviewToken(key)) {
    res.cookies.set(PREVIEW_COOKIE, key!, { httpOnly: true, sameSite: "lax", secure: siteUrl().startsWith("https://"), path: "/", maxAge: 30 * 86400 });
  }
  return res;
}
