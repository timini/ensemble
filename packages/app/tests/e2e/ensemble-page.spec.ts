/**
 * Ensemble Page E2E Tests (T157)
 *
 * Tests the /ensemble page workflow:
 * - Page loads
 * - Model selection (min 2, max 6)
 * - Summarizer designation
 * - Embeddings provider selection
 * - Navigation to /prompt after valid selection
 */

import { test, expect } from '@playwright/test';

test.describe('Ensemble Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate through config first
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();

    // Configure at least 1 API key to enable Continue button
    await page.locator('[data-provider="openai"] input').fill('sk-test-openai-key');

    await page.getByRole('button', { name: /continue/i }).click();

    // Should now be on ensemble page
    await expect(page).toHaveURL('/ensemble');
  });

  test('loads ensemble page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Ensemble AI/i);

    // Check for page hero heading
    await expect(page.locator('h1')).toBeVisible();

    // Check for workflow navigator
    await expect(page.getByTestId('workflow-navigator')).toBeVisible();
  });

  test('displays model selection list', async ({ page }) => {
    // Check for model selection list
    await expect(page.getByTestId('model-selection-list')).toBeVisible();

    // Should have multiple model cards
    const modelCards = page.locator('[data-testid^="model-card-"]');
    await expect(modelCards.first()).toBeVisible();
  });

  test('Continue button is disabled initially', async ({ page }) => {
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeDisabled();
  });

  test('can select models', async ({ page }) => {
    // Select first model
    const firstModel = page.locator('[data-testid^="model-card-"]').first();
    await firstModel.click();

    // Should be selected
    await expect(firstModel).toHaveAttribute('data-selected', 'true');
  });

  test('requires minimum 2 models', async ({ page }) => {
    const continueButton = page.getByRole('button', { name: /continue/i });

    // Select 1 model - button still disabled
    await page.locator('[data-testid^="model-card-"]').first().click();
    await expect(continueButton).toBeDisabled();

    // Select 2nd model - button now enabled
    await page.locator('[data-testid^="model-card-"]').nth(1).click();
    await expect(continueButton).toBeEnabled();
  });

  test('enforces maximum 6 models', async ({ page }) => {
    // Select 6 models
    for (let i = 0; i < 6; i++) {
      await page.locator('[data-testid^="model-card-"]').nth(i).click();
    }

    // 7th model card should be disabled or not selectable
    const seventhModel = page.locator('[data-testid^="model-card-"]').nth(6);
    const isDisabled = await seventhModel.getAttribute('data-disabled');
    expect(isDisabled).toBe('true');
  });

  test('can designate summarizer model', async ({ page }) => {
    // Select 2 models
    await page.locator('[data-testid^="model-card-"]').first().click();
    await page.locator('[data-testid^="model-card-"]').nth(1).click();

    // Click summarizer button on first model
    const summarizerButton = page.locator('[data-testid^="summarizer-button-"]').first();
    await summarizerButton.click();

    // Should show as summarizer
    await expect(page.locator('[data-testid^="model-card-"]').first()).toHaveAttribute(
      'data-summarizer',
      'true'
    );
  });

  test('navigates to /prompt after clicking Continue', async ({ page }) => {
    // Select 2 models
    await page.locator('[data-testid^="model-card-"]').first().click();
    await page.locator('[data-testid^="model-card-"]').nth(1).click();

    // Click Continue button
    await page.getByRole('button', { name: /continue/i }).click();

    // Should navigate to prompt page
    await expect(page).toHaveURL('/prompt');
  });

  test('can navigate back to config', async ({ page }) => {
    // Click Back button
    await page.getByRole('button', { name: /back/i }).click();

    // Should navigate to config page
    await expect(page).toHaveURL('/config');
  });

  test('model selection persists across page refreshes', async ({ page }) => {
    // Select 2 models
    await page.locator('[data-testid^="model-card-"]').first().click();
    await page.locator('[data-testid^="model-card-"]').nth(1).click();

    // Reload page
    await page.reload();

    // Models should still be selected
    await expect(page.locator('[data-testid^="model-card-"]').first()).toHaveAttribute(
      'data-selected',
      'true'
    );
    await expect(page.locator('[data-testid^="model-card-"]').nth(1)).toHaveAttribute(
      'data-selected',
      'true'
    );
  });

  test('workflow navigator shows ensemble step as active', async ({ page }) => {
    // Check that ensemble step is active
    await expect(page.getByTestId('workflow-step-ensemble')).toHaveAttribute(
      'data-active',
      'true'
    );
  });
});
