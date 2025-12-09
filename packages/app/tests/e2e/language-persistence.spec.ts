/**
 * Language Persistence E2E Test (T177)
 *
 * Tests that language (EN/FR) selection persists across:
 * - Page refreshes
 * - Navigation between pages
 * - Browser sessions (localStorage)
 * - UI text updates correctly
 */

import { test, expect } from '@playwright/test';

test.describe('Language Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Start on config page
    await page.goto('/config');
  });

  test('default language is English', async ({ page }) => {
    // Check that html element has lang="en"
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('lang', 'en');

    // Verify English text is displayed
    await expect(page.getByText(/configuration/i)).toBeVisible();
  });

  test('can switch to French via settings modal', async ({ page }) => {
    // Open settings modal
    await page.getByRole('button', { name: /settings/i }).click();

    // Wait for settings modal
    await expect(page.getByRole('dialog')).toBeVisible();

    // Switch to French using Select component
    await page.getByTestId('language-select').click();
    await page.getByRole('option', { name: /français/i }).click();

    // Close modal
    await page.getByRole('button', { name: /terminé|done/i }).click();

    // Verify lang attribute changed
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    // Verify French text is displayed
    await expect(page.getByText(/configuration/i)).toBeVisible();
  });

  test('French language persists across page refresh', async ({ page }) => {
    // Switch to French
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByLabel(/language/i).click();
    await page.getByRole('option', { name: /français/i }).click();
    await page.getByRole('button', { name: /terminé|done/i }).click();

    // Verify French applied
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    // Reload page
    await page.reload();

    // French should still be applied
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('French language persists across navigation', async ({ page }) => {
    // Set French on config page
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByLabel(/language/i).click();
    await page.getByRole('option', { name: /français/i }).click();
    await page.getByRole('button', { name: /terminé|done/i }).click();

    // Navigate to ensemble page (French: "Suivant" = Next)
    await page.locator('[data-mode="free"]').click();
    await page.locator('[data-provider="openai"] input').fill('sk-test-key');
    // Wait for validation to complete and button to be enabled
    await expect(page.getByRole('button', { name: 'Suivant' })).toBeEnabled({ timeout: 10000 });
    await page.getByRole('button', { name: 'Suivant' }).click();

    // French should persist
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    // Navigate to prompt page
    await page.locator('[data-testid^="model-card-"]').first().click();
    await page.locator('[data-testid^="model-card-"]').nth(1).click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // French should still persist
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('can switch back to English', async ({ page }) => {
    // Set French
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByLabel(/language/i).click();
    await page.getByRole('option', { name: /français/i }).click();
    await page.getByRole('button', { name: /terminé|done/i }).click();

    // Verify French
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    // Switch back to English
    await page.getByRole('button', { name: /paramètres|settings/i }).click();
    await page.getByTestId('language-select').click();
    await page.getByRole('option', { name: /english/i }).click();
    await page.getByRole('button', { name: /done|terminé/i }).click();

    // Verify English
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('language persists in localStorage', async ({ page, context }) => {
    // Set French
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByLabel(/language/i).click();
    await page.getByRole('option', { name: /français/i }).click();
    await page.getByRole('button', { name: /terminé|done/i }).click();

    // Check localStorage contains language
    const localStorage = await page.evaluate(() => window.localStorage.getItem('ensemble-ai-store'));
    expect(localStorage).toContain('fr');

    // Close page and open new one (simulates new browser session)
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/config');

    // French should persist from localStorage
    await expect(newPage.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('UI text updates when language changes', async ({ page }) => {
    // Capture English text
    const configTitleEN = await page.locator('h1').first().textContent();

    // Switch to French using Select component
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByTestId('language-select').click();
    await page.getByRole('option', { name: /français/i }).click();
    await page.getByRole('button', { name: /terminé|done/i }).click();

    // Wait for text to update
    await page.waitForTimeout(500);

    // Capture French text
    const configTitleFR = await page.locator('h1').first().textContent();

    // English and French titles should be different
    expect(configTitleEN).not.toBe(configTitleFR);

    // French text should be present
    expect(configTitleFR).toBeTruthy();
  });

  test('all pages respect language preference', async ({ page }) => {
    // Set French using Select component
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByTestId('language-select').click();
    await page.getByRole('option', { name: /français/i }).click();
    await page.getByRole('button', { name: /terminé|done/i }).click();

    // Config page in French
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    // Navigate to ensemble (French: "Suivant" = Next)
    await page.locator('[data-mode="free"]').click();
    await page.locator('[data-provider="openai"] input').fill('sk-test-key');
    // Wait for validation to complete and button to be enabled
    await expect(page.getByRole('button', { name: 'Suivant' })).toBeEnabled({ timeout: 10000 });
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Ensemble page in French
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    // Navigate to prompt
    await page.locator('[data-testid^="model-card-"]').first().click();
    await page.locator('[data-testid^="model-card-"]').nth(1).click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Prompt page in French
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    // Navigate to review
    await page.getByTestId('prompt-textarea').fill('Test en français');
    await page.getByRole('button', { name: /générer les réponses/i }).click();

    // Review page in French
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('only EN and FR are supported', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: /settings/i }).click();

    // Check language dropdown
    await page.getByTestId('language-select').click();

    // Should only show English and Français (not ES, DE, JA, ZH)
    await expect(page.getByRole('option', { name: /english/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /français/i })).toBeVisible();

    // Other languages should not be visible or selectable
    const allOptions = await page.getByRole('option').all();
    expect(allOptions.length).toBeLessThanOrEqual(2);
  });
});
