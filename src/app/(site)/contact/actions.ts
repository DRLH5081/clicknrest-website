"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/auth";
import { sendEnquiryNotice } from "@/lib/email";
import { getPropertyBySlug } from "@/lib/properties";
import { clientIp } from "@/lib/client-ip";

export type EnquiryState = { ok: boolean; message: string; fieldErrors?: Record<string, string>; values?: Record<string, string> } | null;

const Enquiry = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address.").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  property: z.string().trim().max(120).optional().default(""),
  dates: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(10, "Please tell us a little more (at least 10 characters).").max(4000),
  website: z.string().max(0).optional(), // honeypot
});

export async function sendEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const ip = await clientIp();
  const values = Object.fromEntries([...formData.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  if (!rateLimit(`enquiry:${ip}`, 5, 30 * 60_000)) return { ok: false, message: "You've sent several messages recently. Please wait a little and try again, or email us directly.", values };
  const parsed = Enquiry.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    if (fieldErrors.website) return { ok: true, message: "Thanks, your message has been sent." };
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors, values };
  }
  const d = parsed.data;
  const prop = d.property ? getPropertyBySlug(d.property) : null;
  getDb()
    .prepare("INSERT INTO enquiries (name, email, phone, property_id, dates, message) VALUES (?, ?, ?, ?, ?, ?)")
    .run(d.name, d.email, d.phone, prop?.id ?? null, d.dates, d.message);
  await sendEnquiryNotice({ ...d, property: prop?.name });
  return { ok: true, message: "Thanks, your message has been sent. We usually reply within one working day." };
}
