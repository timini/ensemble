/**
 * Free Mode E2E Tests
 *
 * Basic free-mode tests with OpenAI + Anthropic (2 providers):
 * - A run in the workspace: keys in settings, one model per provider, ask
 * - API key validation: an invalid key shows an error and nothing can run
 *
 * Requires TEST_OPENAI_API_KEY and TEST_ANTHROPIC_API_KEY.
 * Skips gracefully when keys are missing.
 */

import { test, expect } from '@playwright/test';
import { answerCards, ask, configureKeys, selectModel } from './helpers';

const OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.TEST_ANTHROPIC_API_KEY;

const hasRequiredKeys = OPENAI_API_KEY && ANTHROPIC_API_KEY;

/** Timeouts for real API calls. */
const TIMEOUT = {
  API_VALIDATION: 30_000,
  MODEL_VISIBLE: 15_000,
  RESPONSE_VISIBLE: 30_000,
  RESPONSE_COMPLETE: 60_000,
} as const;

test.describe('Free Mode Workflow', () => {
  test.skip(!hasRequiredKeys, 'Skipping — requires TEST_OPENAI_API_KEY and TEST_ANTHROPIC_API_KEY');

  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('complete run with 2 providers (OpenAI + Anthropic)', async ({ page }) => {
    test.setTimeout(120_000);

    await configureKeys(
      page,
      [
        ['openai', OPENAI_API_KEY!],
        ['anthropic', ANTHROPIC_API_KEY!],
      ],
      TIMEOUT.API_VALIDATION,
    );

    await selectModel(page, 'gpt', TIMEOUT.MODEL_VISIBLE);
    await selectModel(page, 'claude', TIMEOUT.MODEL_VISIBLE);
    await ask(page, 'Say "Hello from E2E test" and nothing else.');

    for (const prefix of ['gpt', 'claude']) {
      const card = answerCards(page, prefix).first();
      await expect(card).toBeVisible({ timeout: TIMEOUT.RESPONSE_VISIBLE });
      await expect(card).toHaveAttribute('data-status', 'complete', { timeout: TIMEOUT.RESPONSE_COMPLETE });
      await expect(card.getByTestId('answer-card-meta')).toContainText('s');
    }
  });

  test('shows validation error for invalid API key', async ({ page }) => {
    await page.goto('/workspace?panel=settings');
    const sheet = page.getByTestId('settings-sheet');
    await sheet.locator('[data-provider="openai"] input').fill('invalid-key-12345');

    await expect(sheet.getByTestId('api-key-configuration')).toContainText(/error|invalid|incorrect/i, {
      timeout: 10_000,
    });

    await sheet.getByTestId('settings-sheet-close').click();
    await expect(page.getByTestId('workspace-setup')).toBeVisible();
    await expect(page.getByTestId('composer-submit')).toBeDisabled();
  });
});
