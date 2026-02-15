import { test, expect } from '@playwright/test';

test.describe('404 Not Found Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
  });

  test('displays not found page for unknown routes', async ({ page }) => {
    await expect(page.getByTestId('not-found-page')).toBeVisible();
  });

  test('displays heading and description', async ({ page }) => {
    const container = page.getByTestId('not-found-page');
    await expect(container.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(container.locator('p').first()).toBeVisible();
  });

  test('displays Get Started link to /config', async ({ page }) => {
    const container = page.getByTestId('not-found-page');
    const link = container.getByRole('link', { name: /get started|app\.getStarted/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/config');
  });

  test('displays Explore Features link to /features', async ({ page }) => {
    const container = page.getByTestId('not-found-page');
    const link = container.getByRole('link', { name: /explore features|exploreFeatures/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/features');
  });

  test('Get Started link navigates to config page', async ({ page }) => {
    const container = page.getByTestId('not-found-page');
    await container.getByRole('link', { name: /get started|app\.getStarted/i }).click();
    await expect(page).toHaveURL('/config');
  });

  test('Explore Features link navigates to features page', async ({ page }) => {
    const container = page.getByTestId('not-found-page');
    await container.getByRole('link', { name: /explore features|exploreFeatures/i }).click();
    await expect(page).toHaveURL('/features');
  });
});
