import type { MetadataRoute } from "next";
import { siteUrl } from "~/lib/siteUrl";

/**
 * Lets crawlers in, except the API and the dev-only component gallery.
 * Shared runs (`/s/`) stay crawlable so link previews work; their pages
 * carry `noindex`, so search engines leave them out.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/test-components", "/monitoring"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
