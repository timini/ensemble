/**
 * The landing page at /: one sentence on the product, a recorded real run
 * (answers, agreement score and consensus, no keys needed), the three ways
 * in, and basic metadata for search engines and link previews.
 */
import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('explains the product in one sentence', async ({ page }) => {
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ask several AI models at once. See where they agree.');
    await expect(page.getByTestId('landing-lead')).toContainText('scores how closely their answers agree');
  });

  test('shows a recorded real run, labelled with its models, date, calls and cost', async ({ page }) => {
    const run = page.getByTestId('example-run');
    await expect(run.getByTestId('example-run-kind')).toHaveText('Real answers');
    await expect(run.getByTestId('example-run-answer')).toHaveCount(3);
    await expect(run.getByTestId('agreement-ring')).toBeVisible();
    await expect(run.getByTestId('example-run-consensus')).not.toBeEmpty();
    await expect(run.getByTestId('example-run-source')).toContainText('Recorded on 17 November 2026 through OpenRouter');
    await expect(run.getByTestId('example-run-stats')).toContainText('3 models · 7 calls');

    const toggle = run.getByTestId('example-run-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('makes no accuracy claim and links to the benchmarks', async ({ page }) => {
    await expect(page.getByTestId('landing')).not.toContainText(/more accurate|better answers|outperform/i);
    await page.getByTestId('score-guide-benchmarks').click();
    await expect(page).toHaveURL(/\/benchmarks$/);
  });

  test('"Use your own keys" opens the workspace with onboarding on keys', async ({ page }) => {
    await page.getByTestId('ways-in-keys').click();
    await expect(page).toHaveURL(/\/workspace\?start=keys$/);
    await expect(page.getByTestId('onboarding-sheet')).toBeVisible();
    await expect(page.getByTestId('onboarding-path-keys')).toHaveAttribute('aria-checked', 'true');
  });

  test('"Use local models" opens the workspace with onboarding on local models', async ({ page }) => {
    await page.getByTestId('ways-in-local').click();
    await expect(page.getByTestId('onboarding-sheet')).toBeVisible();
    await expect(page.getByTestId('onboarding-path-local')).toHaveAttribute('aria-checked', 'true');
  });

  test('"Sign in for Pro" says it is coming soon and is not a link', async ({ page }) => {
    const pro = page.getByTestId('ways-in-pro');
    await expect(pro).toContainText('Sign in for Pro');
    await expect(pro).toContainText('Coming soon');
    await expect(pro).not.toHaveAttribute('href');
  });

  test('the header leads to the workspace', async ({ page }) => {
    await page.getByTestId('site-header-workspace').click();
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByTestId('composer')).toBeVisible();
  });

  test('has a title, a description and Open Graph tags', async ({ page }) => {
    await expect(page).toHaveTitle('Ensemble AI: ask several AI models at once and see where they agree');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /see where they agree/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Ensemble AI/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Ensemble AI');
  });

  test('is translated into French', async ({ page }) => {
    // Before the app loads, so the app does not write its own state over it.
    await page.addInitScript(() =>
      localStorage.setItem('ensemble-ai-store', JSON.stringify({ onboardingDone: true, language: 'fr' })),
    );
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Interrogez plusieurs modèles d’IA à la fois. Voyez où ils s’accordent.');
    await expect(page.getByTestId('example-run-kind')).toHaveText('Réponses réelles');
  });
});
