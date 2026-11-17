import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSetting } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = getSetting("site");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: site.metaTitle, template: `%s · ${site.brandName}` },
    description: site.metaDescription,
    openGraph: { siteName: site.brandName, type: "website", locale: getSetting("regional").locale.replace("-", "_") },
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = { themeColor: "#FBF8F3", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = getSetting("regional");
  return (
    <html lang={locale}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
