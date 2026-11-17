import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { paymentMode } from "@/lib/payments";
import { emailMode } from "@/lib/email";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/site/Header";
import { Icon } from "@/components/Icon";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Dashboard" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const db = getDb();
  const newEnquiries = (db.prepare("SELECT COUNT(*) c FROM enquiries WHERE status = 'new'").get() as { c: number }).c;
  const attention = (db.prepare("SELECT COUNT(*) c FROM bookings WHERE (cancellation_requested_at IS NOT NULL AND status = 'confirmed') OR needs_attention != '' OR (status = 'pending' AND payment_method = 'bank_transfer')").get() as { c: number }).c;
  const demoPay = paymentMode() === "demo";
  const demoMail = emailMode() === "demo";
  return (
    <div className="min-h-screen bg-sand-100">
      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-sand-200 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-4 flex items-center justify-between lg:mb-8">
            <Link href="/admin"><Logo brand={getSetting("site").brandName} /></Link>
          </div>
          <AdminNav badges={{ "/admin/enquiries": newEnquiries, "/admin/bookings": attention }} />
          <div className="mt-6 hidden space-y-2 border-t border-sand-200 pt-5 text-sm lg:block">
            <Link href="/" target="_blank" className="flex items-center gap-2 text-ink-soft hover:text-ink"><Icon name="external" className="h-4 w-4" /> View website</Link>
            <p className="truncate text-xs text-ink-muted">Signed in as {admin.email}</p>
            <form action={logout}><button className="flex items-center gap-2 text-ink-soft hover:text-ink"><Icon name="logout" className="h-4 w-4" /> Sign out</button></form>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          {(demoPay || demoMail || admin.must_change_password) && (
            <div className="space-y-2 px-4 pt-4 lg:px-8 lg:pt-6">
              {admin.must_change_password ? (
                <p className="flex items-center gap-2 rounded-xl bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
                  <Icon name="alert" className="h-4 w-4 shrink-0" /> You&apos;re using the demo password. <Link href="/admin/settings?tab=account" className="font-semibold underline">Change it now</Link>
                </p>
              ) : null}
              {(demoPay || demoMail) && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>Demo mode:</strong> {demoPay && "payments are simulated (no payment provider connected)"}
                    {demoPay && demoMail && "; "}
                    {demoMail && "emails are logged, not sent"}. See the launch checklist in the README.
                  </span>
                </p>
              )}
            </div>
          )}
          <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
          <form action={logout} className="px-4 pb-8 lg:hidden"><button className="btn-outline">Sign out</button></form>
        </div>
      </div>
    </div>
  );
}
