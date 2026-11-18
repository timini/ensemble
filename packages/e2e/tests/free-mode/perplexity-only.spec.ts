/**
 * Free Mode Perplexity-Only E2E Test
 *
 * A run with only a Perplexity API key configured: two Perplexity models
 * answer.
 *
 * Requires TEST_PERPLEXITY_API_KEY.
 * Skips gracefully when key is missing.
 */

import { test, expect } from '@playwright/test';
import { answerCards, ask, configureKeys, openModelPicker, pickerOption } from './helpers';

const PERPLEXITY_API_KEY = process.env.TEST_PERPLEXITY_API_KEY;

/** Timeouts for real API calls. */
const TIMEOUT = {
  API_VALIDATION: 30_000,
  MODEL_VISIBLE: 15_000,
  RESPONSE_VISIBLE: 30_000,
  RESPONSE_COMPLETE: 60_000,
} as const;

/**
 * Known-good Perplexity model IDs in priority order.
 * These are Agent API effort presets; fast and low are the quickest.
 */
const PREFERRED_PERPLEXITY_MODELS = ['perplexity-fast', 'perplexity-low'];

test.describe('Free Mode - Perplexity Only', () => {
  test.skip(!PERPLEXITY_API_KEY, 'Skipping Perplexity-only test - Perplexity API key not configured');

  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should complete a run with ONLY a Perplexity API key', async ({ page }) => {
    test.setTimeout(120_000);

    await configureKeys(page, [['perplexity', PERPLEXITY_API_KEY!]], TIMEOUT.API_VALIDATION);

    await openModelPicker(page);
    const options = page.locator('[data-testid="model-picker-option"][data-model-id^="perplexity-"]');
    await expect(options.first()).toBeVisible({ timeout: TIMEOUT.MODEL_VISIBLE });

    let selectedCount = 0;
    for (const modelId of PREFERRED_PERPLEXITY_MODELS) {
      if (selectedCount >= 2) break;
      const option = pickerOption(page, modelId);
      if ((await option.count()) > 0) {
        await option.click();
        selectedCount++;
      }
    }
    // Fallback: if preferred models weren't found, pick the last ones listed.
    const count = await options.count();
    for (let i = count - 1; i >= 0 && selectedCount < 2; i--) {
      if ((await options.nth(i).getAttribute('aria-pressed')) === 'true') continue;
      await options.nth(i).click();
      selectedCount++;
    }

    await ask(page, 'Test prompt for Perplexity only');

    const cards = answerCards(page, 'perplexity-');
    await expect(cards).toHaveCount(2, { timeout: TIMEOUT.RESPONSE_VISIBLE });
    await expect(cards.first()).toHaveAttribute('data-status', 'complete', { timeout: TIMEOUT.RESPONSE_COMPLETE });
    await expect(cards.last()).toHaveAttribute('data-status', 'complete', { timeout: TIMEOUT.RESPONSE_COMPLETE });
  });
});
