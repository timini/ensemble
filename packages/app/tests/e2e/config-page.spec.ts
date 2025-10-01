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

    // Check for page hero heading (should be visible on the page)
    await expect(page.getByText(/configuration/i).first()).toBeVisible();

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

  test('Continue button enables after Free mode selection and at least 1 API key configured', async ({ page }) => {
    // Initially disabled
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeDisabled();

    // Select Free mode
    await page.locator('[data-mode="free"]').click();

    // Configure just 1 API key (should be enough to enable Continue)
    await page.locator('[data-provider="openai"] input').fill('sk-test-openai-key');

    // Now enabled
    await expect(continueButton).toBeEnabled();
  });

  test('shows dynamic message based on configured API keys count', async ({ page }) => {
    // Select Free mode
    await page.locator('[data-mode="free"]').click();

    // Initially shows "Configure an API key to continue"
    await expect(page.getByText(/configure an api key to continue/i)).toBeVisible();

    // Configure 1 API key
    await page.locator('[data-provider="openai"] input').fill('sk-test-openai-key');

    // Should show "1 API key configured"
    await expect(page.getByText(/1 API key configured/i)).toBeVisible();
    await expect(page.getByText(/configure more or continue selecting models/i)).toBeVisible();

    // Configure another API key
    await page.locator('[data-provider="anthropic"] input').fill('sk-ant-test-anthropic-key');

    // Should show "2 API keys configured"
    await expect(page.getByText(/2 API keys configured/i)).toBeVisible();
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

    // Configure at least 1 API key
    await page.locator('[data-provider="openai"] input').fill('sk-test-openai-key');

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
