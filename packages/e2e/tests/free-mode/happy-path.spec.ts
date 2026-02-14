/**
 * Free Mode Happy Path E2E Test
 *
 * The complete sunny-day journey with all 4 providers:
 * 1. Config: Select Free mode, enter all 4 API keys
 * 2. Ensemble: Select one model per provider (4 total)
 * 3. Prompt: Verify Standard summarisation is selected, enter prompt, submit
 * 4. Review: Verify all 4 responses complete, agreement analysis loads,
 *    and consensus card loads with meaningful content
 *
 * Requires all 4 TEST_*_API_KEY env vars to be set.
 * Skips gracefully when any key is missing.
 */

import { test, expect } from '@playwright/test';
import { fillAndValidateKey, selectModel } from './helpers';

const OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.TEST_ANTHROPIC_API_KEY;
const GOOGLE_API_KEY = process.env.TEST_GOOGLE_API_KEY;
const XAI_API_KEY = process.env.TEST_XAI_API_KEY;

const hasAllKeys = OPENAI_API_KEY && ANTHROPIC_API_KEY && GOOGLE_API_KEY && XAI_API_KEY;

/** Timeouts for real API calls. */
const TIMEOUT = {
  TEST: 240_000,
  API_VALIDATION: 60_000,
  MODEL_VISIBLE: 15_000,
  RESPONSE_VISIBLE: 30_000,
  RESPONSE_COMPLETE: 60_000,
  CONSENSUS_VISIBLE: 90_000,
  AGREEMENT_VISIBLE: 90_000,
} as const;

/** Provider API keys keyed by data-provider attribute value. */
const API_KEYS: Record<string, string | undefined> = {
  openai: OPENAI_API_KEY,
  anthropic: ANTHROPIC_API_KEY,
  google: GOOGLE_API_KEY,
  xai: XAI_API_KEY,
};

/** Provider prefixes used for model selection and response card matching. */
const PROVIDERS = [
  { modelPrefix: 'gpt', responsePrefix: 'response-card-openai-', label: 'OpenAI' },
  { modelPrefix: 'claude', responsePrefix: 'response-card-anthropic-', label: 'Anthropic' },
  { modelPrefix: 'gemini', responsePrefix: 'response-card-google-', label: 'Google' },
  { modelPrefix: 'grok', responsePrefix: 'response-card-xai-', label: 'XAI' },
];

test.describe('Free Mode — Happy Path', () => {
  test.skip(!hasAllKeys, 'Skipping — one or more TEST_*_API_KEY env vars not set');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('4 providers → Standard summarisation → all responses, agreement analysis, and consensus load', async ({
    page,
  }) => {
    test.setTimeout(TIMEOUT.TEST);

    // ==========================================
    // STEP 1: Config Page — enter all 4 API keys
    // ==========================================
    await test.step('Configure Free mode with all 4 API keys', async () => {
      await page.goto('/config');

      await page.locator('[data-mode="free"]').click();
      await expect(page.locator('[data-mode="free"]')).toHaveAttribute(
        'data-selected',
        'true',
      );

      let count = 1;
      for (const [provider, key] of Object.entries(API_KEYS)) {
        if (key) {
          await fillAndValidateKey(page, provider, key, count++);
        }
      }

      await expect(
        page.getByRole('button', { name: 'Next', exact: true }),
      ).toBeEnabled();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    });

    // ==========================================
    // STEP 2: Ensemble Page — select 4 models
    // ==========================================
    await test.step('Select one model per provider', async () => {
      await expect(page).toHaveURL('/ensemble');
      await expect(page.getByTestId('model-selection-list')).toBeVisible();

      for (const { modelPrefix } of PROVIDERS) {
        await selectModel(page, modelPrefix, TIMEOUT.MODEL_VISIBLE);
      }

      const selectedCards = page.locator(
        '[data-testid^="model-card-"][data-selected="true"]',
      );
      await expect(selectedCards).toHaveCount(4);

      await page.getByRole('button', { name: 'Next', exact: true }).click();
    });

    // ==========================================
    // STEP 3: Prompt Page — Standard mode, enter prompt
    // ==========================================
    await test.step('Verify Standard summarisation and submit prompt', async () => {
      await expect(page).toHaveURL('/prompt');

      // Standard summarisation should be selected by default
      await expect(page.getByTestId('preset-standard')).toBeChecked();

      await page.getByTestId('prompt-textarea').fill(
        'What are the main benefits of exercise? Give a short answer.',
      );

      await page.getByRole('button', { name: /generate responses/i }).click();
      await expect(page).toHaveURL('/review');
    });

    // ==========================================
    // STEP 4: Review Page — verify everything loads
    // ==========================================
    await test.step('Verify all 4 provider responses complete', async () => {
      for (const { responsePrefix, label } of PROVIDERS) {
        const card = page.locator(`[data-testid^="${responsePrefix}"]`).first();
        await expect(card).toBeVisible({ timeout: TIMEOUT.RESPONSE_VISIBLE });
        await expect(card).toHaveAttribute('data-status', 'complete', {
          timeout: TIMEOUT.RESPONSE_COMPLETE,
        });

        const text = await card.textContent();
        expect(
          text && text.length > 10,
          `${label} response should have real content`,
        ).toBe(true);
      }
    });

    await test.step('Verify no error responses', async () => {
      const errorCards = page.locator('[data-status="error"]');
      await expect(errorCards).toHaveCount(0);
    });

    await test.step('Verify agreement analysis loads', async () => {
      await expect(page.getByTestId('agreement-analysis')).toBeVisible({
        timeout: TIMEOUT.AGREEMENT_VISIBLE,
      });

      const analysis = page.getByTestId('agreement-analysis');
      await expect(analysis).toContainText(/%/);
    });

    await test.step('Verify consensus card loads', async () => {
      await expect(page.getByTestId('consensus-card')).toBeVisible({
        timeout: TIMEOUT.CONSENSUS_VISIBLE,
      });

      const consensusCard = page.getByTestId('consensus-card');
      const text = await consensusCard.textContent();
      expect(
        text && text.length > 50,
        'Consensus should have substantial content',
      ).toBe(true);
    });
  });
});
