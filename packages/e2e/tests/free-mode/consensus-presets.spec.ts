/**
 * Free Mode Consensus Methods E2E Tests
 *
 * The method menu (Standard / Ranked) with REAL API keys: Ranked needs 3
 * answers, so it is disabled with 2 models and runs with 3.
 *
 * Skipped in CI unless API key secrets are configured.
 */

import { test, expect } from '@playwright/test';
import { ask, configureKeys, selectModel } from './helpers';

const OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.TEST_ANTHROPIC_API_KEY;
const GOOGLE_API_KEY = process.env.TEST_GOOGLE_API_KEY;

const hasRequiredKeys = OPENAI_API_KEY && ANTHROPIC_API_KEY && GOOGLE_API_KEY;

/** Timeouts for real API calls. */
const TIMEOUT = {
  TEST: 180_000,
  API_VALIDATION: 60_000,
  MODEL_VISIBLE: 15_000,
  RESPONSE_VISIBLE: 30_000,
  RESPONSE_COMPLETE: 60_000,
  CONSENSUS: 120_000,
} as const;

test.describe('Consensus Methods (Free Mode)', () => {
  test.skip(!hasRequiredKeys, 'Skipping — requires TEST_OPENAI_API_KEY, TEST_ANTHROPIC_API_KEY, and TEST_GOOGLE_API_KEY');

  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Ranked is disabled with 2 models and runs with 3', async ({ page }) => {
    test.setTimeout(TIMEOUT.TEST);

    await test.step('Configure 3 API keys', async () => {
      await configureKeys(
        page,
        [
          ['openai', OPENAI_API_KEY!],
          ['anthropic', ANTHROPIC_API_KEY!],
          ['google', GOOGLE_API_KEY!],
        ],
        TIMEOUT.API_VALIDATION,
      );
    });

    await test.step('With 2 models Ranked is disabled', async () => {
      await selectModel(page, 'gpt', TIMEOUT.MODEL_VISIBLE);
      await selectModel(page, 'gemini', TIMEOUT.MODEL_VISIBLE);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('model-chip')).toHaveCount(2);

      await page.getByTestId('method-menu-trigger').click();
      await expect(page.getByTestId('method-option-standard')).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByTestId('method-option-elo')).toBeDisabled();
      await page.keyboard.press('Escape');
    });

    await test.step('A third model makes Ranked available', async () => {
      await selectModel(page, 'claude', TIMEOUT.MODEL_VISIBLE);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('model-chip')).toHaveCount(3);

      await page.getByTestId('method-menu-trigger').click();
      await expect(page.getByTestId('method-option-elo')).toBeEnabled();
      await page.getByTestId('method-option-elo').click();
      await expect(page.getByTestId('method-menu-trigger')).toContainText('Ranked');

      // The Ranked top N field shows in the menu.
      await page.getByTestId('method-menu-trigger').click();
      await expect(page.getByTestId('input-top-n')).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('Ask and get a consensus', async () => {
      await ask(page, 'What is 2+2? Reply with just the number.');

      const firstCard = page.getByTestId('answer-card').first();
      await expect(firstCard).toBeVisible({ timeout: TIMEOUT.RESPONSE_VISIBLE });
      await expect(firstCard).toHaveAttribute('data-status', 'complete', { timeout: TIMEOUT.RESPONSE_COMPLETE });

      const consensus = page.getByTestId('consensus-answer');
      await expect(consensus).toHaveAttribute('data-status', 'success', { timeout: TIMEOUT.CONSENSUS });
      const text = await consensus.textContent();
      expect(text && text.length > 20, 'Consensus should have meaningful content').toBe(true);
    });
  });
});
