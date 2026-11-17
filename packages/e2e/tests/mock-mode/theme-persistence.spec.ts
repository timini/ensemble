/**
 * Theme Persistence E2E Test (T176)
 *
 * The theme (light or dark), chosen in the workspace's settings sheet,
 * persists across reloads, navigation and browser sessions (localStorage).
 */
import { test, expect, type Page } from '@playwright/test';
import { closeSettings, openSettings } from './runHelpers';

async function chooseTheme(page: Page, theme: 'light' | 'dark') {
  const sheet = await openSettings(page);
  await sheet.getByTestId(`theme-${theme}`).click();
  await expect(sheet.getByTestId(`theme-${theme}`)).toHaveAttribute('aria-checked', 'true');
  await closeSettings(page);
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
}

test.describe('Theme Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
  });

  test('default theme is light', async ({ page }) => {
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
  });

  test('can switch to dark in settings', async ({ page }) => {
    await chooseTheme(page, 'dark');
  });

  test('dark theme persists across a reload', async ({ page }) => {
    await chooseTheme(page, 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('dark theme persists across navigation', async ({ page }) => {
    await chooseTheme(page, 'dark');
    for (const path of ['/features', '/about', '/ensemble', '/workspace']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    }
  });

  test('can switch back to light', async ({ page }) => {
    await chooseTheme(page, 'dark');
    await chooseTheme(page, 'light');
  });

  test('theme persists in localStorage', async ({ page, context }) => {
    await chooseTheme(page, 'dark');
    const stored = await page.evaluate(() => window.localStorage.getItem('ensemble-ai-store'));
    expect(stored).toContain('"theme":"dark"');

    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/workspace');
    await expect(newPage.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('the page background follows the theme', async ({ page }) => {
    const light = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
    await chooseTheme(page, 'dark');
    const dark = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(dark).not.toBe(light);
    expect(dark).not.toBe('rgb(255, 255, 255)');
  });
});
