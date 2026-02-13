/**
 * Free Mode Google-Only E2E Test
 *
 * Tests the workflow with only a Google API key configured.
 * Selects 2 Google models and verifies responses complete.
 *
 * Requires TEST_GOOGLE_API_KEY.
 * Skips gracefully when key is missing.
 */

import { test, expect } from '@playwright/test';
import { fillAndValidateKey } from './helpers';

const GOOGLE_API_KEY = process.env.TEST_GOOGLE_API_KEY;

/** Timeouts for real API calls. */
const TIMEOUT = {
  API_VALIDATION: 30_000,
  MODEL_VISIBLE: 15_000,
  RESPONSE_VISIBLE: 30_000,
  RESPONSE_COMPLETE: 60_000,
} as const;

/**
 * Known-good Google model IDs in priority order.
 * Provider APIs list deprecated models (e.g. gemini-1.5-pro) that 404 at
 * generation time, so we target specific working IDs.
 */
const PREFERRED_GOOGLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

test.describe('Free Mode - Google Only', () => {
  test.skip(!GOOGLE_API_KEY, 'Skipping Google-only test - Google API key not configured');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should complete workflow with ONLY Google API key', async ({ page }) => {
    test.setTimeout(120_000);

    // 1. Configuration
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();

    await fillAndValidateKey(page, 'google', GOOGLE_API_KEY!, 1, TIMEOUT.API_VALIDATION);

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // 2. Ensemble — select 2 known-good Google models
    await expect(page).toHaveURL('/ensemble');

    // Wait for Google model cards to load
    await expect(
      page.locator('[data-testid^="model-card-gemini-"]').first(),
    ).toBeVisible({ timeout: TIMEOUT.MODEL_VISIBLE });

    // Select 2 different known-good models
    let selectedCount = 0;
    for (const modelId of PREFERRED_GOOGLE_MODELS) {
      if (selectedCount >= 2) break;
      const card = page.getByTestId(`model-card-${modelId}`);
      if ((await card.count()) > 0) {
        await card.click();
        selectedCount++;
      }
    }

    // Fallback: if preferred models weren't found, pick the last two
    if (selectedCount < 2) {
      const allGemini = page.locator('[data-testid^="model-card-gemini-"]');
      const count = await allGemini.count();
      for (let i = count - 1; i >= 0 && selectedCount < 2; i--) {
        await allGemini.nth(i).click();
        selectedCount++;
      }
    }

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // 3. Prompt
    await expect(page).toHaveURL('/prompt');
    await page.getByTestId('prompt-textarea').fill('Test prompt for Google only');
    await page.getByRole('button', { name: /generate responses/i }).click();

    // 4. Review — verify responses appear and complete
    await expect(page).toHaveURL('/review');

    const responseCards = page.locator('[data-testid^="response-card-google-"]');
    await expect(responseCards).toHaveCount(2, { timeout: TIMEOUT.RESPONSE_VISIBLE });

    await expect(responseCards.first()).toHaveAttribute('data-status', 'complete', {
      timeout: TIMEOUT.RESPONSE_COMPLETE,
    });
    await expect(responseCards.last()).toHaveAttribute('data-status', 'complete', {
      timeout: TIMEOUT.RESPONSE_COMPLETE,
    });
  });
});
