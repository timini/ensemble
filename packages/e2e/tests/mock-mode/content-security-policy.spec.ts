/**
 * The Content-Security-Policy (#352): every page is served with a nonce
 * policy that never allows eval in production, renders and hydrates under
 * it, and the browser reports no violation on any route or during a run.
 */
import { expect, test } from '@playwright/test';
import { watchCspViolations } from '../../fixtures/cspViolations';
import { startMockRun } from './runHelpers';

const ROUTES = [
  '/',
  '/workspace',
  '/workspace?start=pro',
  '/account',
  '/config',
  '/ensemble',
  '/prompt',
  '/review',
  '/features',
  '/about',
  '/benchmarks',
  '/s/not-a-real-share',
  '/no-such-page',
];

/** E2E_BASE_URL runs the suite against a production server (`next start`). */
const production = !!process.env.E2E_BASE_URL;

test('every route is served with a nonce policy and loads without a violation', async ({ page }) => {
  const violations = await watchCspViolations(page);
  for (const route of ROUTES) {
    const response = await page.goto(route);
    const policy = response?.headers()['content-security-policy'] ?? '';
    expect(policy, route).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(policy, route).toContain("frame-ancestors 'none'");
    if (production) expect(policy, route).not.toContain('unsafe-eval');
    // Hydrated: React attached handlers, so scripts ran under the policy.
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
    expect(await violations(), route).toEqual([]);
  }
});

test('a run in the workspace streams, scores and merges under the policy', async ({ page }) => {
  const violations = await watchCspViolations(page);
  await startMockRun(page, { models: ['gpt-6-luna', 'claude-sonnet-5-5'], prompt: 'Why is the sky blue?' });
  await expect(page.locator('[data-testid="answer-card"][data-status="complete"]')).toHaveCount(2, {
    timeout: 60_000,
  });
  await expect(page.getByTestId('consensus-answer')).toBeVisible({ timeout: 60_000 });
  expect(await violations()).toEqual([]);
});

test('the theme script runs before paint with the nonce', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ensemble-ai-store', JSON.stringify({ theme: 'dark', onboardingDone: true }));
  });
  const violations = await watchCspViolations(page);
  await page.goto('/about');
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await violations()).toEqual([]);
});
