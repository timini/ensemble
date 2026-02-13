/**
 * Free Mode E2E Tests
 *
 * Basic free-mode tests with OpenAI + Anthropic (2 providers):
 * - Complete workflow: config → ensemble → prompt → review
 * - API key validation: invalid keys show errors
 *
 * Requires TEST_OPENAI_API_KEY and TEST_ANTHROPIC_API_KEY.
 * Skips gracefully when keys are missing.
 */

import { test, expect } from '@playwright/test';
import { fillAndValidateKey, selectModel } from './helpers';

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
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('complete workflow with 2 providers (OpenAI + Anthropic)', async ({ page }) => {
    test.setTimeout(120_000);

    // 1. Config Page
    await expect(page).toHaveURL('/config');

    await page.locator('[data-mode="free"]').click();

    await fillAndValidateKey(page, 'openai', OPENAI_API_KEY!, 1, TIMEOUT.API_VALIDATION);
    await fillAndValidateKey(page, 'anthropic', ANTHROPIC_API_KEY!, 2, TIMEOUT.API_VALIDATION);

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // 2. Ensemble Page — select one model per provider
    await expect(page).toHaveURL('/ensemble');

    await selectModel(page, 'gpt', TIMEOUT.MODEL_VISIBLE);
    await selectModel(page, 'claude', TIMEOUT.MODEL_VISIBLE);

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // 3. Prompt Page
    await expect(page).toHaveURL('/prompt');

    await page.getByTestId('prompt-textarea').fill('Say "Hello from E2E test" and nothing else.');
    await page.getByRole('button', { name: /generate responses/i }).click();

    // 4. Review Page — verify both responses complete
    await expect(page).toHaveURL('/review');

    const openaiCard = page.locator('[data-testid^="response-card-openai-"]').first();
    const anthropicCard = page.locator('[data-testid^="response-card-anthropic-"]').first();

    await expect(openaiCard).toBeVisible({ timeout: TIMEOUT.RESPONSE_VISIBLE });
    await expect(anthropicCard).toBeVisible({ timeout: TIMEOUT.RESPONSE_VISIBLE });

    await expect(openaiCard).toHaveAttribute('data-status', 'complete', {
      timeout: TIMEOUT.RESPONSE_COMPLETE,
    });
    await expect(anthropicCard).toHaveAttribute('data-status', 'complete', {
      timeout: TIMEOUT.RESPONSE_COMPLETE,
    });

    await expect(openaiCard).toContainText('tokens');
    await expect(anthropicCard).toContainText('tokens');
  });

  test('shows validation error for invalid API key', async ({ page }) => {
    await expect(page).toHaveURL('/config');
    await page.locator('[data-mode="free"]').click();

    await page.locator('[data-provider="openai"] input').fill('invalid-key-12345');

    await expect(page.getByTestId('api-key-configuration')).toContainText(
      /error|invalid|incorrect/i,
      { timeout: 10_000 },
    );

    await expect(
      page.getByRole('button', { name: 'Next', exact: true }),
    ).toBeDisabled();
  });
});
