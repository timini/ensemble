/** Only route templates are sent: never prompts, document IDs or URL parameters. */
export function analyticsPath(path: string): string {
  if (
    [
      "/",
      "/workspace",
      "/account",
      "/features",
      "/about",
      "/benchmarks",
    ].includes(path)
  )
    return path;
  if (/^\/s\/[^/]+$/.test(path)) return "/s/[id]";
  return "/other";
}

export function pageviewParameters(path: string, origin: string) {
  const page = analyticsPath(path);
  return {
    page_location: origin + page,
    page_path: page,
    page_title: "ensemble",
    page_referrer: "",
  };
}

/** Respect browser privacy preferences and exclude previews/staging. */
export function analyticsAllowed(
  hostname: string,
  preferences: { globalPrivacyControl?: boolean; doNotTrack?: string | null },
): boolean {
  return (
    hostname === "ensemble-app--ensemble-ai-prod.us-central1.hosted.app" &&
    preferences.globalPrivacyControl !== true &&
    preferences.doNotTrack !== "1" &&
    preferences.doNotTrack !== "yes"
  );
}

type AnalyticsWindow = Window & { dataLayer?: unknown[] };
let lastPath: string | undefined;
let initialized = false;

/** Basic, consent-denied pageviews. Disable enhanced measurement in this GA stream. */
export function trackPageview(
  path: string,
  measurementId: string | undefined,
  nonce?: string,
): void {
  if (!measurementId || !/^G-[A-Z0-9]+$/.test(measurementId)) return;
  if (typeof window === "undefined" || window.location.protocol !== "https:")
    return;
  if (!analyticsAllowed(window.location.hostname, navigator)) return;
  const target = window as AnalyticsWindow;
  target.dataLayer ??= [];
  // gtag consumes an arguments object, not an array.
  function gtag(..._args: unknown[]) {
    // gtag's command queue expects an arguments object.
    // eslint-disable-next-line prefer-rest-params
    target.dataLayer!.push(arguments);
  }
  const parameters = pageviewParameters(path, window.location.origin);
  if (!initialized) {
    gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    gtag("set", "ads_data_redaction", true);
    gtag("set", "url_passthrough", false);
    gtag("js", new Date());
    gtag("config", measurementId, {
      ...parameters,
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const script = document.createElement("script");
    script.async = true;
    if (nonce) script.nonce = nonce;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
    document.head.appendChild(script);
    initialized = true;
  }
  // StrictMode double effects and query-only changes are not new pageviews.
  if (lastPath === path) return;
  lastPath = path;
  gtag("set", parameters);
  gtag("event", "page_view", { ...parameters, send_to: measurementId });
}
