import type { Metadata } from "next";
import { LookupForm } from "@/components/site/LookupForm";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Manage your booking", description: "Find your booking with your reference and email address." };

export default async function ManagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="container-x max-w-xl pt-12 md:pt-20">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-600">
        <Icon name="key" />
      </span>
      <h1 className="mt-5 font-display text-4xl">Manage your booking</h1>
      <p className="mt-3 text-ink-soft">Enter your booking reference and the email address you booked with. Your reference starts with CNR- and is in your confirmation email.</p>
      {sp.error && (
        <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700" role="alert">
          {sp.error === "link" ? "That booking link has expired or isn't valid. Please look up your booking below." : "Please look up your booking to continue."}
        </p>
      )}
      <div className="card mt-8 p-6 md:p-8">
        <LookupForm />
      </div>
    </div>
  );
}
