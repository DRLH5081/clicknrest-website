import Link from "next/link";
import { getAllSettings, bankDetailsArePlaceholders } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth";
import { paymentMode } from "@/lib/payments";
import { emailMode } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";
import { PageHeader, Panel, Field, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon } from "@/components/Icon";
import { saveSettings, changePassword, setPrivateMode, resetPreviewLink } from "../../actions";
import { isSitePrivate, previewToken } from "@/lib/private-mode";

export const metadata = { title: "Settings" };

const TABS = [
  { key: "site", label: "Business & contact" },
  { key: "regional", label: "Currency & region" },
  { key: "tax", label: "Taxes" },
  { key: "booking", label: "Booking rules" },
  { key: "integrations", label: "Payments & email" },
  { key: "payments", label: "Manual bank transfer" },
  { key: "account", label: "Your account" },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const admin = await requireAdmin();
  const s = getAllSettings();
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "site";
  return (
    <>
      <PageHeader title="Settings" />
      <nav className="mb-6 flex flex-wrap gap-1.5" aria-label="Settings sections">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/settings?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} className={`rounded-full px-3.5 py-1.5 text-sm ${tab === t.key ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-sand-200 hover:ring-ink"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <Flash ok={sp.ok} error={sp.error} />
      {sp.first && <p className="mb-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Welcome! Please replace the demo sign-in details with your own email and a strong password.</p>}

      {tab === "site" && (
        <Panel className="mb-6" title="Website visibility" description={isSitePrivate() ? "Private: the public sees a Coming soon page. You can still see the full site while signed in." : "Open: anyone can see the website and book."}>
          <form action={setPrivateMode.bind(null, !isSitePrivate())}>
            <SubmitButton>{isSitePrivate() ? "Open website to the public" : "Make website private"}</SubmitButton>
          </form>
          {isSitePrivate() && (
            <div className="mt-6 border-t border-sand-200 pt-5">
              <p className="text-sm font-semibold">Preview link</p>
              <p className="mt-1 text-sm text-ink-muted">Send this link to anyone you want to see the website before launch. They can look around and check prices, but can&apos;t book. It works for 30 days on their device.</p>
              <input readOnly value={`${siteUrl()}/preview?key=${previewToken()}`} className="input mt-3 font-mono text-xs" aria-label="Preview link" />
              <form action={resetPreviewLink} className="mt-3">
                <SubmitButton className="btn-outline btn-sm" confirm="Create a new preview link? Anyone with the old link will lose access.">Create a new link (turns off the old one)</SubmitButton>
              </form>
            </div>
          )}
        </Panel>
      )}

      {tab === "site" && (
        <form action={saveSettings.bind(null, "site")}>
          <Panel title="Business & contact" description="Shown in the header, footer, contact page and emails.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Brand name" name="brandName"><input id="brandName" name="brandName" defaultValue={s.site.brandName} className="input" /></Field>
              <Field label="Tagline" name="tagline"><input id="tagline" name="tagline" defaultValue={s.site.tagline} className="input" /></Field>
              <Field label="Default page title (search engines)" name="metaTitle"><input id="metaTitle" name="metaTitle" defaultValue={s.site.metaTitle} className="input" /></Field>
              <Field label="Default meta description" name="metaDescription"><input id="metaDescription" name="metaDescription" defaultValue={s.site.metaDescription} className="input" /></Field>
              <Field label="Owner name" name="ownerName"><input id="ownerName" name="ownerName" defaultValue={s.site.ownerName} className="input" /></Field>
              <Field label="Send booking notifications to" name="ownerNotificationEmail"><input id="ownerNotificationEmail" type="email" name="ownerNotificationEmail" defaultValue={s.site.ownerNotificationEmail} className="input" /></Field>
              <Field label="Public email" name="contactEmail"><input id="contactEmail" type="email" name="contactEmail" defaultValue={s.site.contactEmail} className="input" /></Field>
              <Field label="Public phone" name="contactPhone"><input id="contactPhone" name="contactPhone" defaultValue={s.site.contactPhone} className="input" /></Field>
              <Field label="Address" name="contactAddress" hint="Optional. Leave blank to hide it"><input id="contactAddress" name="contactAddress" defaultValue={s.site.contactAddress} className="input" /></Field>
              <Field label="Opening hours" name="contactHours"><input id="contactHours" name="contactHours" defaultValue={s.site.contactHours} className="input" /></Field>
              <Field label="Instagram URL (optional)" name="instagramUrl"><input id="instagramUrl" name="instagramUrl" defaultValue={s.site.instagramUrl} className="input" /></Field>
              <Field label="Company name (as on Companies House)" name="companyName" hint="Shown in the footer, as UK law requires"><input id="companyName" name="companyName" defaultValue={s.site.companyName} className="input" /></Field>
              <Field label="Company number" name="companyNumber"><input id="companyNumber" name="companyNumber" defaultValue={s.site.companyNumber} className="input" /></Field>
              <Field label="Registered office address" name="registeredOffice" hint="Must match Companies House" className="md:col-span-2"><input id="registeredOffice" name="registeredOffice" defaultValue={s.site.registeredOffice} className="input" /></Field>
            </div>
            <div className="mt-6"><SubmitButton>Save</SubmitButton></div>
          </Panel>
        </form>
      )}

      {tab === "regional" && (
        <form action={saveSettings.bind(null, "regional")}>
          <Panel title="Currency & region" description="Changing currency doesn't convert existing prices; update your rates afterwards. Existing bookings keep their original currency.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Currency" name="currency" hint="3-letter code: GBP, EUR, USD…"><input id="currency" name="currency" defaultValue={s.regional.currency} maxLength={3} className="input uppercase" /></Field>
              <Field label="Locale" name="locale" hint="Formats dates and numbers: en-GB, en-IE, fr-FR…"><input id="locale" name="locale" defaultValue={s.regional.locale} className="input" /></Field>
              <Field label="Time zone" name="timeZone" hint="e.g. Europe/London"><input id="timeZone" name="timeZone" defaultValue={s.regional.timeZone} className="input" /></Field>
            </div>
            <div className="mt-6"><SubmitButton>Save</SubmitButton></div>
          </Panel>
        </form>
      )}

      {tab === "tax" && (
        <form action={saveSettings.bind(null, "tax")}>
          <Panel title="Taxes" description="Check with your accountant which taxes apply to your lets.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Tax name" name="name"><input id="name" name="name" defaultValue={s.tax.name} className="input" /></Field>
              <Field label="Rate (%)" name="ratePercent"><input id="ratePercent" type="number" step="0.01" min={0} max={50} name="ratePercent" defaultValue={s.tax.ratePercent} className="input" /></Field>
              <Field label="How it's applied" name="mode">
                <select id="mode" name="mode" defaultValue={s.tax.mode} className="input">
                  <option value="included">Included in my prices (shown as “includes VAT”)</option>
                  <option value="added">Added on top at checkout</option>
                  <option value="none">No tax</option>
                </select>
              </Field>
            </div>
            <div className="mt-6"><SubmitButton>Save</SubmitButton></div>
          </Panel>
        </form>
      )}

      {tab === "booking" && (
        <form action={saveSettings.bind(null, "booking")}>
          <Panel title="Booking rules & cancellation policy" description="Minimum stays and prices are set per property.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Hold dates during checkout (minutes)" name="holdMinutes"><input id="holdMinutes" type="number" min={10} max={120} name="holdMinutes" defaultValue={s.booking.holdMinutes} className="input" /></Field>
              <Field label="Open bookings this many months ahead" name="maxAdvanceMonths"><input id="maxAdvanceMonths" type="number" min={1} max={36} name="maxAdvanceMonths" defaultValue={s.booking.maxAdvanceMonths} className="input" /></Field>
              <div />
              <Field label="Full refund if cancelled at least (days before)" name="fullRefundDays"><input id="fullRefundDays" type="number" min={0} name="fullRefundDays" defaultValue={s.booking.fullRefundDays} className="input" /></Field>
              <Field label="Partial refund if at least (days before)" name="partialRefundDays"><input id="partialRefundDays" type="number" min={0} name="partialRefundDays" defaultValue={s.booking.partialRefundDays} className="input" /></Field>
              <Field label="Partial refund (%)" name="partialRefundPercent"><input id="partialRefundPercent" type="number" min={0} max={100} name="partialRefundPercent" defaultValue={s.booking.partialRefundPercent} className="input" /></Field>
              <Field label="Cancellation summary shown to guests" name="cancellationSummary" hint="Keep this consistent with the numbers above and your Cancellation policy page." className="md:col-span-3">
                <textarea id="cancellationSummary" name="cancellationSummary" rows={3} defaultValue={s.booking.cancellationSummary} className="input" />
              </Field>
            </div>
            <div className="mt-6"><SubmitButton>Save</SubmitButton></div>
          </Panel>
        </form>
      )}

      {tab === "payments" && (
        <form action={saveSettings.bind(null, "payments")}>
          <Panel title="Manual bank transfer (optional)" description="Off by default. Guests can already pay from their bank with Pay by Bank on Stripe's checkout, which confirms bookings automatically. Switch this on only if you also want to show your account details and confirm each transfer yourself.">
            {bankDetailsArePlaceholders(s.payments) && (
              <p className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">These are placeholder details, and guests are warned not to send money. Replace them with your business account before launch.</p>
            )}
            <label className="mb-5 flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="bankTransferEnabled" defaultChecked={s.payments.bankTransferEnabled} className="h-4 w-4 accent-gold-600" /> Offer bank transfer at checkout
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Account name" name="accountName"><input id="accountName" name="accountName" defaultValue={s.payments.accountName} className="input" /></Field>
              <Field label="Bank (optional)" name="bankName"><input id="bankName" name="bankName" defaultValue={s.payments.bankName} className="input" /></Field>
              <Field label="Sort code" name="sortCode"><input id="sortCode" name="sortCode" inputMode="numeric" placeholder="12-34-56" pattern="\d{2}-?\d{2}-?\d{2}" title="6 digits, for example 12-34-56" defaultValue={s.payments.sortCode} className="input font-mono" /></Field>
              <Field label="Account number" name="accountNumber"><input id="accountNumber" name="accountNumber" inputMode="numeric" placeholder="12345678" pattern="\s*\d{8}\s*" title="8 digits" defaultValue={s.payments.accountNumber} className="input font-mono" /></Field>
              <Field label="Hold dates for (hours)" name="transferHoldHours" hint="If the money hasn't arrived by then, the dates are released. 24 hours suits UK transfers, which usually arrive within minutes.">
                <input id="transferHoldHours" type="number" min={1} max={168} name="transferHoldHours" defaultValue={s.payments.transferHoldHours} className="input" />
              </Field>
              <Field label="Extra note for guests (optional)" name="transferNote" hint="For example: please send a screenshot of the payment to our WhatsApp.">
                <input id="transferNote" name="transferNote" defaultValue={s.payments.transferNote} className="input" />
              </Field>
            </div>
            <div className="mt-6"><SubmitButton>Save</SubmitButton></div>
          </Panel>
        </form>
      )}

      {tab === "integrations" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Payments">
            {paymentMode() === "stripe" ? (
              <p className="flex items-center gap-2 text-sm text-olive-700"><Icon name="check" className="h-4 w-4" /> Stripe is connected. Guests pay on Stripe&apos;s secure checkout page, by card or with Pay by Bank if it&apos;s turned on in your Stripe payment method settings.</p>
            ) : (
              <div className="space-y-3 text-sm text-ink-soft">
                <p className="flex items-center gap-2 font-semibold text-amber-700"><Icon name="info" className="h-4 w-4" /> Demo mode: payments are simulated.</p>
                <p>To take real payments, create a Stripe account and set these on your server, then restart:</p>
                <pre className="overflow-x-auto rounded-xl bg-ink p-3 text-xs text-sand-100">STRIPE_SECRET_KEY=sk_live_…{"\n"}STRIPE_WEBHOOK_SECRET=whsec_…</pre>
                <p>Webhook URL: <code className="rounded bg-sand-100 px-1">{siteUrl()}/api/stripe/webhook</code></p>
                <p>To let guests pay straight from their bank, turn on <strong>Pay by Bank</strong> in Stripe under Settings, then Payment methods. It appears at checkout automatically, next to card payments.</p>
              </div>
            )}
          </Panel>
          <Panel title="Email">
            {emailMode() === "smtp" ? (
              <p className="flex items-center gap-2 text-sm text-olive-700"><Icon name="check" className="h-4 w-4" /> Email server connected. Confirmations are sent to guests and to you.</p>
            ) : (
              <div className="space-y-3 text-sm text-ink-soft">
                <p className="flex items-center gap-2 font-semibold text-amber-700"><Icon name="info" className="h-4 w-4" /> Demo mode: emails are logged, not sent.</p>
                <p>Connect any SMTP provider (Postmark, Resend, SendGrid, your email host) by setting:</p>
                <pre className="overflow-x-auto rounded-xl bg-ink p-3 text-xs text-sand-100">SMTP_HOST=…{"\n"}SMTP_PORT=587{"\n"}SMTP_USER=…{"\n"}SMTP_PASS=…{"\n"}EMAIL_FROM=&quot;Your Brand &lt;bookings@yourdomain&gt;&quot;</pre>
                <p><Link href="/admin/emails" className="underline">See logged emails</Link></p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === "account" && (
        <form action={changePassword}>
          <Panel title="Sign-in details" description="Only you can access this dashboard. Use a long, unique password.">
            <div className="grid max-w-xl gap-4">
              <Field label="Sign-in email" name="email"><input id="email" type="email" name="email" defaultValue={admin.email} autoComplete="username" className="input" /></Field>
              <Field label="Current password" name="current"><input id="current" type="password" name="current" required autoComplete="current-password" className="input" /></Field>
              <Field label="New password" name="next" hint="At least 12 characters"><input id="next" type="password" name="next" required minLength={12} autoComplete="new-password" className="input" /></Field>
              <Field label="Confirm new password" name="confirm"><input id="confirm" type="password" name="confirm" required minLength={12} autoComplete="new-password" className="input" /></Field>
            </div>
            <div className="mt-6"><SubmitButton>Update sign-in details</SubmitButton></div>
          </Panel>
        </form>
      )}
    </>
  );
}
