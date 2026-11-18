/** Origin used when APP_URL is not set (local development and tests). */
export const LOCAL_SITE_URL = "http://localhost:3000";

/**
 * The public origin of the site, from APP_URL (the custom domain once it
 * is live), without a trailing slash. Canonical links, the sitemap and
 * Open Graph URLs are built from it. Server only: APP_URL is not exposed
 * to the browser.
 */
export function siteUrl(
  env: { APP_URL?: string } = { APP_URL: process.env.APP_URL },
): string {
  const raw = env.APP_URL?.trim();
  if (!raw) return LOCAL_SITE_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return LOCAL_SITE_URL;
  }
}
