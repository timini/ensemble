import type { MetadataRoute } from "next";

/** Lets crawlers in, except the API and the dev-only component gallery. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/test-components"],
    },
  };
}
