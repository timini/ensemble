/** Path of a share's public page. */
export function sharePath(id: string): string {
  return `/s/${id}`;
}

/** Full link to a share, on `origin` (the page's origin, or APP_URL). */
export function shareUrl(origin: string, id: string): string {
  return `${origin.replace(/\/+$/, "")}${sharePath(id)}`;
}

/**
 * A share date as a long date in the reader's language, in UTC, so the
 * server and the browser render the same text.
 */
export function formatShareDate(ms: number, language: string): string {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(ms));
}
