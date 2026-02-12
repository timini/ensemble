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

import { test, expect, type Page } from '@playwright/test';

test.describe('Ensemble Page', () => {
  const enabledModels = (page: Page) =>
    page.locator('[data-testid^="model-card-"][data-disabled="false"]');

  test.beforeEach(async ({ page }) => {
    // Navigate through config first
    await page.goto('/config');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.locator('[data-mode="free"]').click();

    // Configure at least 1 API key to enable Continue button
    await page.locator('[data-provider="openai"] input').fill('sk-test-openai-key');

    await page.getByRole('button', { name: 'Next', exact: true }).click();

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

  test('Next button is disabled initially', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextButton).toBeDisabled();
  });

  test('can select models', async ({ page }) => {
    const firstModel = enabledModels(page).first();
    await firstModel.click();

    // Should be selected
    await expect(firstModel).toHaveAttribute('data-selected', 'true');
  });

  test('requires minimum 2 models', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });

    // Select 1 model - button still disabled
    await enabledModels(page).first().click();
    await expect(nextButton).toBeDisabled();

    // Select 2nd model - button now enabled
    await enabledModels(page).nth(1).click();
    await expect(nextButton).toBeEnabled();
  });

  test('enforces maximum 6 models', async ({ page }) => {
    // Ensure enough providers are enabled
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();
    await page.locator('[data-provider="openai"] input').fill('sk-openai');
    await page.locator('[data-provider="anthropic"] input').fill('sk-anthropic');
    await page.locator('[data-provider="google"] input').fill('sk-google');
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    const enabledCards = enabledModels(page);
    const count = await enabledCards.count();

    for (let i = 0; i < Math.min(6, count); i++) {
      await enabledCards.nth(i).click();
    }

    const seventhEnabled = enabledCards.nth(6);
    if (await seventhEnabled.count()) {
      await expect(seventhEnabled).toHaveAttribute('data-disabled', 'true');
    }
  });

  test('can designate summarizer model', async ({ page }) => {
    // Select 2 models
    await enabledModels(page).first().click();
    await enabledModels(page).nth(1).click();

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
    await enabledModels(page).first().click();
    await enabledModels(page).nth(1).click();

    // Click Continue button
    await page.getByRole('button', { name: 'Next', exact: true }).click();

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
    await enabledModels(page).first().click();
    await enabledModels(page).nth(1).click();

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

  test('disables providers without configured API keys', async ({ page }) => {
    // Navigate back to config and configure only OpenAI
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();
    await page.locator('[data-provider="openai"] input').fill('sk-test-openai-key');
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    const selector = '[data-testid="model-card-gemini-1.5-pro"]';
    const googleCard = page.locator(selector);
    await expect(googleCard).toHaveAttribute('data-disabled', 'true');

    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      el?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, selector);

    await expect(googleCard).not.toHaveAttribute('data-selected', 'true');
  });

  test.describe('Sidebar Continue Button', () => {
    test('sidebar continue button is visible on ensemble page', async ({ page }) => {
      const sidebarButton = page.getByTestId('continue-to-prompt');
      await expect(sidebarButton).toBeVisible();
    });

    test('sidebar continue button is disabled with less than 2 models', async ({ page }) => {
      const sidebarButton = page.getByTestId('continue-to-prompt');
      await expect(sidebarButton).toBeDisabled();

      // Select 1 model - still disabled
      await enabledModels(page).first().click();
      await expect(sidebarButton).toBeDisabled();
    });

    test('sidebar continue button is enabled with 2 models selected', async ({ page }) => {
      await enabledModels(page).first().click();
      await enabledModels(page).nth(1).click();

      const sidebarButton = page.getByTestId('continue-to-prompt');
      await expect(sidebarButton).toBeEnabled();
    });

    test('sidebar continue button navigates to /prompt', async ({ page }) => {
      await enabledModels(page).first().click();
      await enabledModels(page).nth(1).click();

      await page.getByTestId('continue-to-prompt').click();
      await expect(page).toHaveURL('/prompt');
    });
  });

  test('shows manual responses in sidebar after creation', async ({ page }) => {
    await page.getByTestId('add-manual-response').click();
    await page.getByTestId('model-name-input').fill('Manual Test');
    await page.getByTestId('model-provider-input').fill('Provider');
    await page.getByTestId('response-textarea').fill('Manual content');
    await page.getByTestId('submit-button').click();

    await expect(page.getByTestId('manual-responses-list')).toContainText('Manual Test');
  });
});
