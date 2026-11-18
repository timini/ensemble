import type { MetadataRoute } from "next";
import { siteUrl } from "~/lib/siteUrl";

/** The public pages. The workspace and account are app screens, and shared runs expire. */
export const SITEMAP_PATHS = [
  "/",
  "/features",
  "/about",
  "/benchmarks",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  return SITEMAP_PATHS.map((path) => ({
    url: `${origin}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
