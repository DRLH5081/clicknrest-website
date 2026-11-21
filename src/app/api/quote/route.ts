import { blockedByPrivateMode } from "@/lib/private-mode";
import { NextResponse } from "next/server";
import { getPropertyBySlug } from "@/lib/properties";
import { quoteStay } from "@/lib/pricing";

export async function POST(req: Request) {
  if (await blockedByPrivateMode()) return Response.json({ error: "This website is not open yet." }, { status: 403 });
  let body: { slug?: unknown; checkIn?: unknown; checkOut?: unknown; guests?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }
  const p = typeof body.slug === "string" ? getPropertyBySlug(body.slug, { publishedOnly: true }) : null;
  if (!p) return NextResponse.json({ ok: false, message: "Property not found" }, { status: 404 });
  const q = quoteStay(p, { checkIn: body.checkIn, checkOut: body.checkOut, guests: body.guests });
  return NextResponse.json(q, { headers: { "Cache-Control": "no-store" } });
}
