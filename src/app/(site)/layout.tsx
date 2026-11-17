import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getSetting } from "@/lib/settings";
import { paymentMode } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = getSetting("site");
  return (
    <>
      <Header brand={site.brandName} tagline={site.tagline} demo={paymentMode() === "demo"} />
      <main id="main">{children}</main>
      <Footer site={site} />
    </>
  );
}
