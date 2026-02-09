/**
 * Model ID API Call Test
 *
 * Verifies that model IDs (e.g., "gpt-4o") are stored in the Zustand store
 * and passed to provider API calls, NOT display names (e.g., "GPT-4o").
 *
 * This test prevents regression of a bug where display names like
 * "Gemini 3 Pro Preview" were sent to the Google API instead of
 * "gemini-3-pro-preview", causing 400 errors.
 */

import { test, expect, type Page } from '@playwright/test';

const fillAndValidateKey = async (
  page: Page,
  provider: string,
  value: string,
  expectedCount: number,
) => {
  const label =
    expectedCount === 1
      ? /1 API key configured/i
      : new RegExp(`${expectedCount} API keys configured`, 'i');
  await page.locator(`[data-provider="${provider}"] input`).fill(value);
  await expect(page.getByText(label)).toBeVisible();
};

test.describe('Model ID in API Calls', () => {
  test('stores model IDs (not display names) in Zustand state', async ({ page }) => {
    // 1. Config: Select Free mode, configure an API key
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();
    await fillAndValidateKey(page, 'openai', 'sk-test-model-id-check', 1);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL('/ensemble');

    // 2. Select 2 models
    const enabledModels = page.locator('[data-testid^="model-card-"][data-disabled="false"]');
    await expect(enabledModels.first()).toBeVisible();

    // Get the test IDs of the first two enabled model cards (these contain the model ID)
    const firstCardTestId = await enabledModels.nth(0).getAttribute('data-testid');
    const secondCardTestId = await enabledModels.nth(1).getAttribute('data-testid');

    // Extract model IDs from test IDs (format: "model-card-{modelId}")
    const firstModelId = firstCardTestId!.replace('model-card-', '');
    const secondModelId = secondCardTestId!.replace('model-card-', '');

    await enabledModels.nth(0).click();
    await enabledModels.nth(1).click();

    // 3. Verify the Zustand store has model IDs, not display names
    const storeState = await page.evaluate(() => {
      const raw = localStorage.getItem('ensemble-ai-store');
      if (!raw) return null;
      return JSON.parse(raw);
    });

    expect(storeState).not.toBeNull();
    const selectedModels = storeState.selectedModels;
    expect(selectedModels).toHaveLength(2);

    // The .model field should contain the model ID (e.g., "gpt-4o"),
    // NOT the display name (e.g., "GPT-4o")
    expect(selectedModels[0].model).toBe(firstModelId);
    expect(selectedModels[1].model).toBe(secondModelId);

    // Model IDs should be lowercase with hyphens (API format), not title case
    for (const model of selectedModels) {
      expect(model.model).not.toMatch(/[A-Z]/);
      expect(model.model).toMatch(/^[a-z0-9][\w.-]*$/);
    }
  });

  test('responses complete without model name format errors', async ({ page }) => {
    // Full workflow: verify no "unexpected model name format" errors
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();
    await fillAndValidateKey(page, 'openai', 'sk-test-model-id', 1);
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Select 2 models
    const enabledModels = page.locator('[data-testid^="model-card-"][data-disabled="false"]');
    await enabledModels.nth(0).click();
    await enabledModels.nth(1).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Enter prompt and submit
    await page.getByTestId('prompt-textarea').fill('Test model ID in API call');
    await page.getByRole('button', { name: /generate responses/i }).click();
    await expect(page).toHaveURL('/review');

    // Wait for responses to complete
    const responseCards = page.locator('[data-testid^="response-card-"]');
    await expect(responseCards).toHaveCount(2);

    // Verify both responses complete without errors
    for (let i = 0; i < 2; i++) {
      await expect(responseCards.nth(i)).toHaveAttribute('data-status', 'complete', { timeout: 15000 });
    }

    // Verify no error messages about model name format
    const errorMessages = page.locator('[data-testid^="response-card-"] [data-testid="error-message"]');
    await expect(errorMessages).toHaveCount(0);
  });
});
