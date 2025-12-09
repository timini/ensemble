/**
 * Theme Persistence E2E Test (T176)
 *
 * Tests that theme (light/dark) selection persists across:
 * - Page refreshes
 * - Navigation between pages
 * - Browser sessions (localStorage)
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Start on config page
    await page.goto('/config');
  });

  test('default theme is light', async ({ page }) => {
    // Check that html element has 'light' class
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/light/);
  });

  test('can switch to dark theme via settings modal', async ({ page }) => {
    // Open settings modal
    await page.getByRole('button', { name: /settings/i }).click();

    // Wait for settings modal to appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click dark theme card
    await page.getByTestId('theme-dark').click();

    // Close modal
    await page.getByRole('button', { name: /done/i }).click();

    // Verify dark theme applied
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });

  test('dark theme persists across page refresh', async ({ page }) => {
    // Set dark theme
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByTestId('theme-dark').click();
    await page.getByRole('button', { name: /done/i }).click();

    // Verify dark theme applied
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload page
    await page.reload();

    // Dark theme should still be applied
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('dark theme persists across navigation', async ({ page }) => {
    // Set dark theme on config page
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByTestId('theme-dark').click();
    await page.getByRole('button', { name: /done/i }).click();

    // Navigate to ensemble page
    await page.locator('[data-mode="free"]').click();
    await page.locator('[data-provider="openai"] input').fill('sk-test-key');
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Dark theme should persist
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Navigate to prompt page
    await page.locator('[data-testid^="model-card-"]').first().click();
    await page.locator('[data-testid^="model-card-"]').nth(1).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Dark theme should still persist
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('can switch back to light theme', async ({ page }) => {
    // Set dark theme
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByTestId('theme-dark').click();
    await page.getByRole('button', { name: /done/i }).click();

    // Verify dark theme
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Switch back to light
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByTestId('theme-light').click();
    await page.getByRole('button', { name: /done/i }).click();

    // Verify light theme
    await expect(page.locator('html')).toHaveClass(/light/);
  });

  test('theme persists in localStorage', async ({ page, context }) => {
    // Set dark theme
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByTestId('theme-dark').click();
    await page.getByRole('button', { name: /done/i }).click();

    // Check localStorage contains theme
    const localStorage = await page.evaluate(() => window.localStorage.getItem('ensemble-ai-store'));
    expect(localStorage).toContain('dark');

    // Close page and open new one (simulates new browser session)
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/config');

    // Dark theme should persist from localStorage
    await expect(newPage.locator('html')).toHaveClass(/dark/);
  });

  test('UI elements respond to theme changes', async ({ page }) => {
    // Check light theme colors
    const pageHero = page.locator('[data-testid="page-hero"]').first();
    await expect(pageHero).toBeVisible();

    // Switch to dark theme
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByTestId('theme-dark').click();
    await page.getByRole('button', { name: /done/i }).click();

    // UI should adapt to dark theme (dark mode classes applied)
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Verify body background changed
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Dark theme should have darker background (not pure white)
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });
});
