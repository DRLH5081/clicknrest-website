import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { Logo } from "@/components/site/Header";
import { ForgotForm } from "./ForgotForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-100 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo brand={getSetting("site").brandName} /></div>
        <div className="card p-8">
          <h1 className="font-display text-2xl">Forgot your password?</h1>
          <p className="mb-6 mt-1 text-sm text-ink-muted">Enter your dashboard sign-in email and we&apos;ll send you a link to choose a new password.</p>
          <ForgotForm />
          <p className="mt-6 text-center text-sm"><Link href="/admin/login" className="text-ink-soft underline">Back to sign in</Link></p>
        </div>
      </div>
    </main>
  );
}
