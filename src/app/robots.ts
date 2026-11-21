import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { isSitePrivate } from "@/lib/private-mode";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (isSitePrivate()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/book", "/pay", "/booking"] }, sitemap: `${siteUrl()}/sitemap.xml` };
}
