import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { listPublishedProperties } from "@/lib/properties";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages = ["", "/stays", "/about", "/faqs", "/contact", "/legal/privacy", "/legal/terms", "/legal/cancellation"].map((p) => ({ url: `${base}${p}` }));
  return [...pages, ...listPublishedProperties().map((p) => ({ url: `${base}/stays/${p.slug}`, lastModified: p.updated_at.replace(" ", "T") + "Z" }))];
}
