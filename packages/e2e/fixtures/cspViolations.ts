import type { Page } from '@playwright/test';

/**
 * Collects Content-Security-Policy violations on a page: the
 * `securitypolicyviolation` events of every document it loads, and the
 * console messages the browser prints when it refuses something. Call
 * before the first navigation; the returned function lists what was
 * blocked so far.
 */
export async function watchCspViolations(page: Page): Promise<() => Promise<string[]>> {
  const consoleMessages: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/Content Security Policy|Content-Security-Policy/i.test(text)) consoleMessages.push(text);
  });
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = seen;
    document.addEventListener('securitypolicyviolation', (e) => {
      seen.push(`${e.effectiveDirective} blocked ${e.blockedURI || 'inline'} on ${location.pathname}`);
    });
  });
  return async () => {
    const events = await page
      .evaluate(() => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [])
      .catch(() => [] as string[]);
    return [...events, ...consoleMessages];
  };
}
