/**
 * Shared steps for the accessibility suite: open a page at a viewport and
 * theme, and check it with axe-core against WCAG 2.1 A and AA.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/**
 * Stores the theme and a finished onboarding before the first page loads.
 * Later loads in the same tab keep whatever the test changed.
 */
export async function seedTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => {
    if (sessionStorage.getItem('a11y-seeded')) return;
    sessionStorage.setItem('a11y-seeded', '1');
    localStorage.setItem('ensemble-ai-store', JSON.stringify({ theme: t, onboardingDone: true }));
  }, theme);
}

/** One line per violation and node, so a failure says what to fix. */
function describe(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']): string[] {
  return violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')} :: ${n.failureSummary?.split('\n').slice(1).join(' ').trim()}`),
  );
}

/** Runs axe on the whole page and expects no WCAG 2.1 A or AA violations. */
export async function expectAccessible(page: Page) {
  // Let transitions finish so colours are measured at rest.
  await page.waitForTimeout(350);
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  const { violations, incomplete } = await builder.analyze();
  // A11Y_REPORT=1 also prints what axe could not decide (for example contrast
  // behind an overlay), for a manual look.
  if (process.env.A11Y_REPORT) {
    const notes = incomplete.flatMap((i) => i.nodes.map((n) => `${i.id}: ${n.target.join(' ')}`));
    console.log(`axe incomplete on ${page.url()}:`, notes);
  }
  expect(describe(violations)).toEqual([]);
}

/** Fails when the page scrolls sideways (content wider than the viewport). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
