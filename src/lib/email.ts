import "server-only";
import nodemailer from "nodemailer";
import { getDb } from "./db";
import { getSetting, bankDetailsArePlaceholders } from "./settings";
import { formatMoney } from "./format";
import { formatDate } from "./dates";
import type { Booking } from "./bookings";
import { getPropertyById } from "./properties";
import { siteUrl } from "./site-url";

/**
 * Email delivery.
 * - With SMTP_HOST (and friends) set, messages are sent through that server.
 * - Without it the site runs in DEMO mode: messages are recorded in the
 *   admin "Email log" only and nobody receives them.
 */
export function emailMode(): "smtp" | "demo" {
  return process.env.SMTP_HOST ? "smtp" : "demo";
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, paragraphs: string[], rows: [string, string][] = [], cta?: { label: string; url: string }) {
  const site = getSetting("site");
  const rowsHtml = rows.length
    ? `<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 0;color:#6B6158;font-size:14px">${escapeHtml(k)}</td><td style="padding:6px 0;text-align:right;font-size:14px;color:#221E1A">${escapeHtml(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#FBF8F3;font-family:Helvetica,Arial,sans-serif;color:#221E1A">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <p style="font-family:Georgia,serif;font-size:20px;margin:0 0 24px">${escapeHtml(site.brandName)}</p>
    <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #E9E0D2">
      <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${escapeHtml(p)}</p>`).join("")}
      ${rowsHtml}
      ${cta ? `<p style="margin:24px 0 0"><a href="${escapeHtml(cta.url)}" style="background:#9E4423;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:bold">${escapeHtml(cta.label)}</a></p>` : ""}
    </div>
    <p style="font-size:12px;color:#6B6158;margin-top:20px">${escapeHtml(site.brandName)} · ${escapeHtml(site.contactEmail)} · ${escapeHtml(site.contactPhone)}</p>
  </div></body></html>`;
  const text = [title, "", ...paragraphs, "", ...rows.map(([k, v]) => `${k}: ${v}`), cta ? `\n${cta.label}: ${cta.url}` : ""].join("\n");
  return { html, text };
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; bookingId?: number }) {
  const db = getDb();
  const mode = emailMode();
  let status = mode === "demo" ? "logged_demo" : "sent";
  let error = "";
  if (mode === "smtp") {
    try {
      await getTransport().sendMail({
        from: process.env.EMAIL_FROM || getSetting("site").contactEmail,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
      console.error("[email] send failed", error);
    }
  } else {
    console.info(`[email:demo] to=${msg.to} subject="${msg.subject}" (not sent; recorded in admin Email log)`);
  }
  db.prepare(
    "INSERT INTO email_outbox (to_address, subject, text_body, html_body, transport, status, error, booking_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(msg.to, msg.subject, msg.text, msg.html, mode, status, error, msg.bookingId ?? null);
}

function bookingRows(b: Booking): [string, string][] {
  const { locale } = getSetting("regional");
  const p = getPropertyById(b.property_id);
  const fmt = (n: number) => formatMoney(n, b.currency, locale);
  return [
    ["Reference", b.reference],
    ["Property", p?.name ?? ""],
    ["Check-in", `${formatDate(b.check_in, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} from ${p?.check_in_time ?? ""}`],
    ["Check-out", `${formatDate(b.check_out, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} by ${p?.check_out_time ?? ""}`],
    ["Guests", `${b.adults} adult${b.adults === 1 ? "" : "s"}${b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}`],
    ["Total", fmt(b.total)],
    ["Paid", fmt(b.amount_paid)],
  ];
}

export function bookingLink(b: Booking, token?: string) {
  return token ? `${siteUrl()}/booking/access?ref=${b.reference}&token=${encodeURIComponent(token)}` : `${siteUrl()}/booking/manage`;
}

export async function sendBookingConfirmation(b: Booking, token?: string) {
  const site = getSetting("site");
  const p = getPropertyById(b.property_id);
  const demo = b.payment_mode === "demo";
  const guest = layout(
    demo ? "Your demo booking is confirmed" : "Your booking is confirmed",
    [
      `Hi ${b.guest_name.split(" ")[0]},`,
      `Thank you for booking ${p?.name ?? "with us"} directly. Your reservation is confirmed and the dates are reserved for you.`,
      ...(demo ? ["DEMO: this booking was made on a demonstration website. No payment was taken and no stay has been booked."] : []),
      `We'll send your arrival details and directions before check-in. Check-in is from ${p?.check_in_time ?? "15:00"} and check-out is by ${p?.check_out_time ?? "10:00"}.`,
      `Need an earlier check-in or a later check-out? We can often arrange it for £15 per hour, subject to availability. Just message us on ${site.contactPhone}.`,
      `Your cancellation terms: ${getSetting("booking").cancellationSummary}`,
    ],
    bookingRows(b),
    { label: "View your booking", url: bookingLink(b, token) },
  );
  await sendEmail({ to: b.guest_email, subject: `${demo ? "[DEMO] " : ""}Booking confirmed · ${b.reference}`, ...guest, bookingId: b.id });

  const owner = layout(
    "New booking received",
    [`${b.guest_name} (${b.guest_email}${b.guest_phone ? ", " + b.guest_phone : ""}) has booked ${p?.name}.`, ...(b.guest_message ? [`Message from guest: “${b.guest_message}”`] : [])],
    bookingRows(b),
    { label: "Open in dashboard", url: `${siteUrl()}/admin/bookings/${b.reference}` },
  );
  await sendEmail({ to: site.ownerNotificationEmail, subject: `${demo ? "[DEMO] " : ""}New booking ${b.reference} · ${p?.name}`, ...owner, bookingId: b.id });
}

/** Sent when a guest chooses to pay by bank transfer: the bank details, reference and deadline. */
export async function sendBankTransferInstructions(b: Booking, token: string) {
  const site = getSetting("site");
  const pay = getSetting("payments");
  const { locale, timeZone } = getSetting("regional");
  const p = getPropertyById(b.property_id);
  const demo = b.payment_mode === "demo" || bankDetailsArePlaceholders(pay);
  const deadline = b.hold_expires_at
    ? new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", weekday: "long", day: "numeric", month: "long", timeZone }).format(new Date(b.hold_expires_at))
    : "";
  const bankRows: [string, string][] = [
    ["Amount to pay", formatMoney(b.total, b.currency, locale)],
    ...(pay.bankName.trim() ? ([["Bank", pay.bankName]] as [string, string][]) : []),
    ["Account name", pay.accountName],
    ["Sort code", pay.sortCode],
    ["Account number", pay.accountNumber],
    ["Payment reference", b.reference],
  ];
  const guest = layout(
    "Your dates are held: please pay by bank transfer",
    [
      `Hi ${b.guest_name.split(" ")[0]},`,
      `Thanks for choosing ${p?.name ?? "us"}. We're holding your dates${deadline ? ` until ${deadline}` : ""} while your bank transfer arrives. Please use ${b.reference} as the payment reference.`,
      ...(demo ? ["DEMO: these are placeholder bank details on a demonstration website. Do not send money."] : []),
      "Your booking is confirmed once the money reaches us, and we'll email you straight away. If it hasn't arrived by the deadline, the dates are released.",
      "We will never email or message you to change our bank details. If anyone does, don't pay and call us first.",
      ...(pay.transferNote.trim() ? [pay.transferNote] : []),
    ],
    [...bankRows, ...bookingRows(b).filter(([k]) => k !== "Paid" && k !== "Total")],
    { label: "View your booking", url: bookingLink(b, token) },
  );
  await sendEmail({ to: b.guest_email, subject: `${demo ? "[DEMO] " : ""}Bank transfer details · ${b.reference}`, ...guest, bookingId: b.id });

  const owner = layout(
    "Awaiting a bank transfer",
    [
      `${b.guest_name} (${b.guest_email}${b.guest_phone ? ", " + b.guest_phone : ""}) wants to book ${p?.name} and will pay ${formatMoney(b.total, b.currency, locale)} by bank transfer with reference ${b.reference}.`,
      `The dates are held${deadline ? ` until ${deadline}` : ""}. When the money is in your account, open the booking and click "Mark transfer received" to confirm it and email the guest.`,
    ],
    bookingRows(b),
    { label: "Open in dashboard", url: `${siteUrl()}/admin/bookings/${b.reference}` },
  );
  await sendEmail({ to: site.ownerNotificationEmail, subject: `${demo ? "[DEMO] " : ""}Awaiting transfer ${b.reference} · ${p?.name}`, ...owner, bookingId: b.id });
}

export async function sendCancellationEmails(b: Booking, refundAmount: number) {
  const site = getSetting("site");
  const { locale } = getSetting("regional");
  const guest = layout(
    "Your booking has been cancelled",
    [
      `Hi ${b.guest_name.split(" ")[0]},`,
      `Your booking ${b.reference} has been cancelled.`,
      refundAmount > 0
        ? b.payment_method !== "card"
          ? `We're sending a refund of ${formatMoney(refundAmount, b.currency, locale)} back to the account you paid from.`
          : `A refund of ${formatMoney(refundAmount, b.currency, locale)} has been issued to your original payment method. Refunds usually arrive within 5 to 10 working days.`
        : "No refund is due under the cancellation terms for this booking. Please get in touch if you have any questions.",
    ],
    bookingRows(b),
  );
  await sendEmail({ to: b.guest_email, subject: `Booking cancelled · ${b.reference}`, ...guest, bookingId: b.id });
  const owner = layout("Booking cancelled", [`${b.reference} for ${b.guest_name} has been cancelled.`], bookingRows(b));
  await sendEmail({ to: site.ownerNotificationEmail, subject: `Cancelled ${b.reference}`, ...owner, bookingId: b.id });
}

export async function sendRefundEmail(b: Booking, amount: number) {
  const { locale } = getSetting("regional");
  const m = layout(
    "A refund is on its way",
    [
      `Hi ${b.guest_name.split(" ")[0]},`,
      b.payment_method !== "card"
        ? `We're sending a refund of ${formatMoney(amount, b.currency, locale)} for booking ${b.reference} back to the account you paid from.`
        : `We've issued a refund of ${formatMoney(amount, b.currency, locale)} for booking ${b.reference}. It usually arrives within 5 to 10 working days.`,
    ],
    bookingRows(b),
  );
  await sendEmail({ to: b.guest_email, subject: `Refund issued · ${b.reference}`, ...m, bookingId: b.id });
}

export async function sendCancellationRequestNotice(b: Booking) {
  const site = getSetting("site");
  const owner = layout(
    "Cancellation requested",
    [`${b.guest_name} has asked to cancel ${b.reference}.`, b.cancellation_reason ? `Reason: “${b.cancellation_reason}”` : ""].filter(Boolean),
    bookingRows(b),
    { label: "Review in dashboard", url: `${siteUrl()}/admin/bookings/${b.reference}` },
  );
  await sendEmail({ to: site.ownerNotificationEmail, subject: `Cancellation request · ${b.reference}`, ...owner, bookingId: b.id });
  const guest = layout(
    "We've received your cancellation request",
    [`Hi ${b.guest_name.split(" ")[0]},`, `Thanks for letting us know. We'll review your request for ${b.reference} and confirm by email, including any refund due under your cancellation terms.`],
    bookingRows(b),
  );
  await sendEmail({ to: b.guest_email, subject: `Cancellation request received · ${b.reference}`, ...guest, bookingId: b.id });
}

export async function sendEnquiryNotice(e: { name: string; email: string; phone: string; message: string; property?: string; dates?: string }) {
  const site = getSetting("site");
  const m = layout(
    "New enquiry from the website",
    [`${e.name} (${e.email}${e.phone ? ", " + e.phone : ""}) sent an enquiry.`, e.message],
    [
      ["Property", e.property || "Not specified"],
      ["Dates", e.dates || "Not specified"],
    ],
    { label: "Open enquiries", url: `${siteUrl()}/admin/enquiries` },
  );
  await sendEmail({ to: site.ownerNotificationEmail, subject: `Website enquiry from ${e.name}`, ...m });
}

export async function sendAdminPasswordReset(to: string, url: string) {
  const m = layout(
    "Reset your dashboard password",
    [
      "Someone (hopefully you) asked to reset the password for the owner dashboard.",
      "The link below works once and expires in 30 minutes. If you didn't ask for this, you can ignore this email and nothing will change.",
    ],
    [],
    { label: "Choose a new password", url },
  );
  await sendEmail({ to, subject: "Reset your dashboard password", ...m });
}
