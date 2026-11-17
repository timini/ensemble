/**
 * /features: what Ensemble does, following the claims rule in
 * docs/PRODUCT_VISION.md (agreement and comparison, no accuracy promise),
 * with links to the workspace and the benchmarks.
 */
import { test, expect } from '@playwright/test';

test.describe('Features Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/features');
  });

  test('introduces the product with its title and lead', async ({ page }) => {
    await expect(page.getByTestId('features-page')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Everything you need to compare AI answers');
    await expect(page.getByTestId('page-intro-lead')).toContainText('does not promise that the merged answer beats the best single model');
    await expect(page).toHaveTitle('Features | Ensemble AI');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Features | Ensemble AI');
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Ensemble AI');
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  });

  test('lists what a run gives you, where models come from, privacy and the two modes', async ({ page }) => {
    await expect(page.getByTestId('features-core').getByTestId('features-core-item')).toHaveCount(6);
    await expect(page.getByTestId('features-models')).toContainText('Ollama');
    await expect(page.getByTestId('features-privacy')).toContainText('never to our server');
    const modes = page.getByTestId('features-modes');
    await expect(modes).toContainText('Free: works today');
    await expect(modes).toContainText('Pro: coming soon');
  });

  test('makes no accuracy claim beyond the benchmarks, and links to them', async ({ page }) => {
    await expect(page.getByTestId('features-page')).not.toContainText(/more accurate|better answers|outperform/i);
    await expect(page.getByTestId('features-claims')).toContainText('is not settled');
    // No benchmark run is published yet, so the page states no figures.
    await expect(page.getByTestId('features-claims')).not.toContainText(/\d\s?%/);
    await expect(page.getByTestId('features-page')).not.toContainText(/safe to use/i);
    await page.getByTestId('features-claims-benchmarks').click();
    await expect(page).toHaveURL(/\/benchmarks$/);
  });

  test('leads to the workspace', async ({ page }) => {
    await expect(page.getByTestId('features-workspace-link')).toHaveAttribute('href', '/workspace');
    await expect(page.getByTestId('features-benchmarks-link')).toHaveAttribute('href', '/benchmarks');
  });

  test('header Features link navigates to features page', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('navigation', { name: /main/i }).getByRole('link', { name: /features/i }).click();
    await expect(page).toHaveURL('/features');
    await expect(page.getByTestId('features-page')).toBeVisible();
  });
});
