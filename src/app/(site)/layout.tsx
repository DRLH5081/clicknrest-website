import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSetting } from "@/lib/settings";
import { paymentMode } from "@/lib/payments";
import { getAdmin } from "@/lib/auth";
import { isSitePrivate } from "@/lib/private-mode";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = getSetting("site");
  const isPrivate = isSitePrivate();
  const admin = isPrivate ? await getAdmin() : null;

  if (isPrivate && !admin) {
    return (
      <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 text-center text-white">
        <h1 className="font-display text-4xl">{site.brandName}</h1>
        <p className="mt-4 max-w-md text-lg text-white/80">Our new website is coming soon.</p>
        {site.contactEmail && (
          <p className="mt-6 text-sm text-white/70">
            Questions? Email <a href={`mailto:${site.contactEmail}`} className="text-gold-400 underline">{site.contactEmail}</a>
          </p>
        )}
        {site.companyName && (
          <p className="mt-16 max-w-md text-xs text-white/50">
            {site.brandName} is a trading name of {site.companyName}, registered in England and Wales
            {site.companyNumber ? `, company number ${site.companyNumber}` : ""}.{site.registeredOffice ? ` Registered office: ${site.registeredOffice}.` : ""}
          </p>
        )}
      </main>
    );
  }

  return (
    <>
      {isPrivate && (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-800">
          Private mode: only you can see this site. The public sees a &quot;Coming soon&quot; page.{" "}
          <Link href="/admin/settings?tab=site" className="font-semibold underline">Change</Link>
        </p>
      )}
      <Header brand={site.brandName} tagline={site.tagline} demo={paymentMode() === "demo"} />
      <main id="main">{children}</main>
      <Footer site={site} />
    </>
  );
}
