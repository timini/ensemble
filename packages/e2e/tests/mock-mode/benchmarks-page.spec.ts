import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The page reads the committed summary, so the expectations follow it:
 * "not run yet" with the method while no results are committed, and one
 * results table per dataset once they are. The results rendering itself (tables, intervals,
 * p-values, notices) is covered against fixture summaries in
 * packages/app/src/app/benchmarks/__tests__/page.test.tsx. The matrix command
 * never publishes a mock run to the app, and the page hides one outside
 * development.
 */
const summary = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../app/src/data/benchmark-summary.json'), 'utf8'),
) as { status: string; mode: string; datasets: unknown[] };
const hasResults = summary.status !== 'not-run' && summary.datasets.length > 0 && summary.mode !== 'mock';

test.describe('Benchmarks Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/benchmarks');
  });

  test('loads with a hero', async ({ page }) => {
    await expect(page.getByTestId('benchmarks-page')).toBeVisible();
    await expect(page.getByTestId('page-hero')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /benchmarks/i })).toBeVisible();
  });

  test('always shows the method with a link to the full description', async ({ page }) => {
    const method = page.getByTestId('benchmark-method');
    await expect(method).toBeVisible();
    await expect(page.getByTestId('benchmark-method-statistics')).toContainText('Wilson');
    await expect(page.getByTestId('benchmark-method-statistics')).toContainText('McNemar');
    await expect(page.getByTestId('benchmark-method-docs')).toHaveAttribute('href', /BENCHMARKS\.md$/);
  });

  test('shows results only when they exist, and never placeholder numbers', async ({ page }) => {
    if (hasResults) {
      await expect(page.getByTestId('benchmark-results-table')).toHaveCount(summary.datasets.length);
      await expect(page.getByTestId('benchmarks-not-run')).toHaveCount(0);
    } else {
      await expect(page.getByTestId('benchmarks-not-run')).toBeVisible();
      await expect(page.getByTestId('benchmarks-not-run')).toContainText('Benchmarks not run yet');
      await expect(page.getByTestId('benchmark-results-table')).toHaveCount(0);
      await expect(page.getByTestId('accuracy-interval')).toHaveCount(0);
    }
  });

  test('footer link opens the page', async ({ page }) => {
    await page.goto('/config');
    await page.getByTestId('site-footer').getByRole('link', { name: /benchmarks/i }).click();
    await expect(page).toHaveURL('/benchmarks');
    await expect(page.getByTestId('benchmarks-page')).toBeVisible();
  });

  test('about page links to it', async ({ page }) => {
    await page.goto('/about');
    await page.getByTestId('about-benchmarks-link').click();
    await expect(page).toHaveURL('/benchmarks');
  });
});
