import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { Logo } from "@/components/site/Header";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Owner sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const demo = !!getDb().prepare("SELECT 1 FROM admin_users WHERE must_change_password = 1 AND email = 'owner@example.com'").get();
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-100 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo brand={getSetting("site").brandName} /></div>
        <div className="card p-8">
          <h1 className="font-display text-2xl">Owner dashboard</h1>
          <p className="mb-6 mt-1 text-sm text-ink-muted">Sign in to manage your homes and bookings.</p>
          <LoginForm demoHint={demo} />
        </div>
      </div>
    </main>
  );
}
