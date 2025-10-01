/**
 * Config Page E2E Tests
 *
 * Tests the /config page workflow:
 * - Page loads
 * - Mode selection (Free mode)
 * - Next button disabled until mode selected
 * - Navigation to /ensemble after selection
 */

import { test, expect } from '@playwright/test';

test.describe('Config Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to config page
    await page.goto('/config');
  });

  test('loads config page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/AI Ensemble/i);

    // Check for page hero heading
    await expect(page.locator('h1')).toContainText(/configuration/i);

    // Check for workflow navigator
    await expect(page.getByTestId('workflow-navigator')).toBeVisible();
  });

  test('displays mode selection cards', async ({ page }) => {
    // Check for Free mode card
    await expect(page.locator('[data-mode="free"]')).toBeVisible();

    // Check for Pro mode card
    await expect(page.locator('[data-mode="pro"]')).toBeVisible();
  });

  test('Continue button is disabled initially', async ({ page }) => {
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeDisabled();
  });

  test('can select Free mode', async ({ page }) => {
    // Click Free mode card
    await page.locator('[data-mode="free"]').click();

    // Verify card is selected (has selected styling)
    await expect(page.locator('[data-mode="free"]')).toHaveAttribute(
      'data-selected',
      'true'
    );
  });

  test('Continue button enables after mode selection', async ({ page }) => {
    // Initially disabled
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeDisabled();

    // Select Free mode
    await page.locator('[data-mode="free"]').click();

    // Now enabled
    await expect(continueButton).toBeEnabled();
  });

  test('can toggle between Free and Pro modes', async ({ page }) => {
    // Select Free mode
    await page.locator('[data-mode="free"]').click();
    await expect(page.locator('[data-mode="free"]')).toHaveAttribute(
      'data-selected',
      'true'
    );

    // Select Pro mode
    await page.locator('[data-mode="pro"]').click();
    await expect(page.locator('[data-mode="pro"]')).toHaveAttribute(
      'data-selected',
      'true'
    );
    await expect(page.locator('[data-mode="free"]')).toHaveAttribute(
      'data-selected',
      'false'
    );
  });

  test('navigates to /ensemble after clicking Continue', async ({ page }) => {
    // Select Free mode
    await page.locator('[data-mode="free"]').click();

    // Click Continue button
    await page.getByRole('button', { name: /continue/i }).click();

    // Should navigate to ensemble page
    await expect(page).toHaveURL('/ensemble');
  });

  test('mode selection persists across page refreshes', async ({ page }) => {
    // Select Free mode
    await page.locator('[data-mode="free"]').click();

    // Reload page
    await page.reload();

    // Free mode should still be selected
    await expect(page.locator('[data-mode="free"]')).toHaveAttribute(
      'data-selected',
      'true'
    );
  });
});
