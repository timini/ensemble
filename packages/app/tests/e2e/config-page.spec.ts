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
    await expect(page).toHaveTitle(/Ensemble AI/i);

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

  test('Continue button enables after Free mode selection and API keys configured', async ({ page }) => {
    // Initially disabled
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeDisabled();

    // Select Free mode
    await page.locator('[data-mode="free"]').click();

    // Configure all 4 API keys
    await page.getByTestId('api-key-input-openai').fill('sk-test-openai-key');
    await page.getByTestId('api-key-input-anthropic').fill('sk-ant-test-anthropic-key');
    await page.getByTestId('api-key-input-google').fill('AIza-test-google-key');
    await page.getByTestId('api-key-input-xai').fill('xai-test-xai-key');

    // Now enabled
    await expect(continueButton).toBeEnabled();
  });

  test('Pro mode is disabled with Coming Soon text', async ({ page }) => {
    // Pro mode card should be visible but disabled
    const proModeCard = page.locator('[data-mode="pro"]');
    await expect(proModeCard).toBeVisible();
    await expect(proModeCard).toHaveAttribute('data-disabled', 'true');

    // Button should show "Coming Soon"
    await expect(proModeCard.getByRole('button')).toContainText(/coming soon/i);
    await expect(proModeCard.getByRole('button')).toBeDisabled();
  });

  test('navigates to /ensemble after clicking Continue', async ({ page }) => {
    // Select Free mode
    await page.locator('[data-mode="free"]').click();

    // Configure all 4 API keys
    await page.getByTestId('api-key-input-openai').fill('sk-test-openai-key');
    await page.getByTestId('api-key-input-anthropic').fill('sk-ant-test-anthropic-key');
    await page.getByTestId('api-key-input-google').fill('AIza-test-google-key');
    await page.getByTestId('api-key-input-xai').fill('xai-test-xai-key');

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
