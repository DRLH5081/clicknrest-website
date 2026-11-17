import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSetting } from "@/lib/settings";

export default function NotFound() {
  const site = getSetting("site");
  return (
    <>
      <Header brand={site.brandName} tagline={site.tagline} demo={!process.env.STRIPE_SECRET_KEY} />
      <main id="main" className="container-x flex max-w-xl flex-col items-center py-24 text-center">
        <p className="eyebrow">Page not found</p>
        <h1 className="mt-3 font-display text-4xl">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-ink-soft">It may have moved, or the home may no longer be listed.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/stays" className="btn-primary">Browse stays</Link>
          <Link href="/" className="btn-outline">Home</Link>
        </div>
      </main>
      <Footer site={site} />
    </>
  );
}
