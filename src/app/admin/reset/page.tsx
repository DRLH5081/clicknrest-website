import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { checkPasswordResetToken } from "@/lib/auth";
import { Logo } from "@/components/site/Header";
import { ResetForm } from "./ResetForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = !!(await checkPasswordResetToken(token));
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-100 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo brand={getSetting("site").brandName} /></div>
        <div className="card p-8">
          <h1 className="font-display text-2xl">Choose a new password</h1>
          {valid ? (
            <>
              <p className="mb-6 mt-1 text-sm text-ink-muted">Use at least 12 characters. A short phrase of a few words works well.</p>
              <ResetForm token={token} />
            </>
          ) : (
            <p className="mt-4 rounded-xl bg-danger-50 p-3 text-sm text-danger-700">
              This link has expired or has already been used. <Link href="/admin/forgot" className="font-semibold underline">Ask for a new one</Link>.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
