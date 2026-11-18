/**
 * Free Mode Google-Only E2E Test
 *
 * A run with only a Google API key configured: two Google models answer.
 * Runs after every deploy (one test, kept cheap).
 *
 * Requires TEST_GOOGLE_API_KEY.
 * Skips gracefully when key is missing.
 */

import { test, expect } from '@playwright/test';
import { answerCards, ask, configureKeys, openModelPicker, pickerOption } from './helpers';

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
const PREFERRED_GOOGLE_MODELS = ['gemini-3.5-flash-lite', 'gemini-4-hydrogen'];

test.describe('Free Mode - Google Only', () => {
  test.skip(!GOOGLE_API_KEY, 'Skipping Google-only test - Google API key not configured');

  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should complete a run with ONLY a Google API key', async ({ page }) => {
    test.setTimeout(120_000);

    await configureKeys(page, [['google', GOOGLE_API_KEY!]], TIMEOUT.API_VALIDATION);

    await openModelPicker(page);
    const gemini = page.locator('[data-testid="model-picker-option"][data-model-id^="gemini-"]');
    await expect(gemini.first()).toBeVisible({ timeout: TIMEOUT.MODEL_VISIBLE });

    let selectedCount = 0;
    for (const modelId of PREFERRED_GOOGLE_MODELS) {
      if (selectedCount >= 2) break;
      const option = pickerOption(page, modelId);
      if ((await option.count()) > 0) {
        await option.click();
        selectedCount++;
      }
    }
    // Fallback: if preferred models weren't found, pick the last ones listed.
    const count = await gemini.count();
    for (let i = count - 1; i >= 0 && selectedCount < 2; i--) {
      if ((await gemini.nth(i).getAttribute('aria-pressed')) === 'true') continue;
      await gemini.nth(i).click();
      selectedCount++;
    }

    await ask(page, 'Test prompt for Google only');

    const cards = answerCards(page, 'gemini-');
    await expect(cards).toHaveCount(2, { timeout: TIMEOUT.RESPONSE_VISIBLE });
    await expect(cards.first()).toHaveAttribute('data-status', 'complete', { timeout: TIMEOUT.RESPONSE_COMPLETE });
    await expect(cards.last()).toHaveAttribute('data-status', 'complete', { timeout: TIMEOUT.RESPONSE_COMPLETE });
  });
});
