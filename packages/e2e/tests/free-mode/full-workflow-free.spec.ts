/**
 * Full Workflow E2E Test — Free Mode (All 4 Providers)
 *
 * Tests the complete user journey through all 4 pages with REAL API keys:
 * 1. Config: Select Free mode, enter all 4 provider API keys
 * 2. Ensemble: Select one model per provider (4 total)
 * 3. Prompt: Enter prompt and submit
 * 4. Review: Verify all 4 responses complete without errors
 *
 * Requires all 4 TEST_*_API_KEY env vars to be set.
 * Skips gracefully when any key is missing.
 */

import { test, expect, type Page } from '@playwright/test';

const OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.TEST_ANTHROPIC_API_KEY;
const GOOGLE_API_KEY = process.env.TEST_GOOGLE_API_KEY;
const XAI_API_KEY = process.env.TEST_XAI_API_KEY;

const hasAllKeys = OPENAI_API_KEY && ANTHROPIC_API_KEY && GOOGLE_API_KEY && XAI_API_KEY;

/** Timeouts for real API calls (validation, model loading, streaming). */
const TIMEOUT = {
  TEST: 180_000,
  API_VALIDATION: 60_000,
  MODEL_VISIBLE: 15_000,
  RESPONSE_VISIBLE: 30_000,
  RESPONSE_COMPLETE: 60_000,
} as const;

/** Provider API keys keyed by data-provider attribute value. */
const API_KEYS: Record<string, string | undefined> = {
  openai: OPENAI_API_KEY,
  anthropic: ANTHROPIC_API_KEY,
  google: GOOGLE_API_KEY,
  xai: XAI_API_KEY,
};

/** Model card testid prefixes keyed by provider. */
const MODEL_PREFIXES = ['gpt', 'claude', 'gemini', 'grok'];

/** Response card testid prefixes with display labels. */
const RESPONSE_PROVIDERS = [
  { prefix: 'response-card-openai-', label: 'OpenAI' },
  { prefix: 'response-card-anthropic-', label: 'Anthropic' },
  { prefix: 'response-card-google-', label: 'Google' },
  { prefix: 'response-card-xai-', label: 'XAI' },
];

/** Fill an API key input by provider data attribute and wait for the configured count. */
const fillAndValidateKey = async (
  page: Page,
  provider: string,
  value: string,
  expectedCount: number,
) => {
  await page.locator(`[data-provider="${provider}"] input`).fill(value);
  const label =
    expectedCount === 1
      ? /1 API key configured/i
      : new RegExp(`${expectedCount} API keys configured`, 'i');
  await expect(page.getByText(label)).toBeVisible({ timeout: TIMEOUT.API_VALIDATION });
};

test.describe('Free Mode - Full MVP Journey (All 4 Providers)', () => {
  test.skip(!hasAllKeys, 'Skipping — one or more TEST_*_API_KEY env vars not set');

  test.beforeEach(async ({ page }) => {
    // Start from a clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('completes Config → Ensemble → Prompt → Review with all 4 providers', async ({
    page,
  }) => {
    test.setTimeout(TIMEOUT.TEST);

    // ==========================================
    // STEP 1: Config Page — enter all 4 API keys
    // ==========================================
    await test.step('Configure Free mode with all 4 API keys', async () => {
      await page.goto('/config');
      await expect(page).toHaveTitle(/Ensemble AI/i);

      // Select Free mode
      await page.locator('[data-mode="free"]').click();
      await expect(page.locator('[data-mode="free"]')).toHaveAttribute(
        'data-selected',
        'true',
      );

      // Next button should be disabled before keys
      const nextButton = page.getByRole('button', { name: 'Next', exact: true });
      await expect(nextButton).toBeDisabled();

      // Enter all 4 provider API keys (validation hits real APIs)
      let count = 1;
      for (const [provider, key] of Object.entries(API_KEYS)) {
        if (key) {
          await fillAndValidateKey(page, provider, key, count++);
        }
      }

      // Next button should now be enabled
      await expect(nextButton).toBeEnabled();
    });

    await test.step('Navigate to ensemble page', async () => {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page).toHaveURL('/ensemble');
    });

    // ==========================================
    // STEP 2: Ensemble Page — select 4 models (one per provider)
    // ==========================================
    await test.step('Select one model per provider', async () => {
      // Wait for model cards to load from real APIs
      await expect(page.getByTestId('model-selection-list')).toBeVisible();

      // Select first available model from each provider
      for (const prefix of MODEL_PREFIXES) {
        const model = page.locator(`[data-testid^="model-card-${prefix}-"]`).first();
        await expect(model).toBeVisible({ timeout: TIMEOUT.MODEL_VISIBLE });
        await model.click();
      }

      // Verify 4 models selected
      const selectedCards = page.locator(
        '[data-testid^="model-card-"][data-selected="true"]',
      );
      await expect(selectedCards).toHaveCount(4);

      // Next button should be enabled
      await expect(
        page.getByRole('button', { name: 'Next', exact: true }),
      ).toBeEnabled();
    });

    await test.step('Navigate to prompt page', async () => {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page).toHaveURL('/prompt');
    });

    // ==========================================
    // STEP 3: Prompt Page — submit a simple prompt
    // ==========================================
    await test.step('Enter and submit prompt', async () => {
      const promptText = 'What is 2+2? Reply with just the number.';

      await page.getByTestId('prompt-textarea').fill(promptText);
      await expect(page.getByTestId('prompt-textarea')).toHaveValue(promptText);

      // Generate Responses button should be enabled
      const generateButton = page.getByRole('button', {
        name: /generate responses/i,
      });
      await expect(generateButton).toBeEnabled();
      await generateButton.click();

      // Navigate to review
      await expect(page).toHaveURL('/review');
    });

    // ==========================================
    // STEP 4: Review Page — verify all 4 responses
    // ==========================================
    await test.step('Verify all 4 provider responses complete', async () => {
      for (const { prefix, label } of RESPONSE_PROVIDERS) {
        const card = page.locator(`[data-testid^="${prefix}"]`).first();
        await expect(card).toBeVisible({ timeout: TIMEOUT.RESPONSE_VISIBLE });
        await expect(card).toHaveAttribute('data-status', 'complete', {
          timeout: TIMEOUT.RESPONSE_COMPLETE,
        });

        // Verify card has real content (not empty / lorem ipsum)
        const text = await card.textContent();
        expect(
          text && text.length > 10,
          `${label} response should have real content`,
        ).toBe(true);

        // Verify token count is displayed
        await expect(card).toContainText('tokens');
      }
    });

    await test.step('Verify no error responses', async () => {
      const errorCards = page.locator('[data-status="error"]');
      await expect(errorCards).toHaveCount(0);
    });

    await test.step('Verify navigation buttons are present', async () => {
      await expect(
        page.getByRole('button', { name: /back to prompt/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /new comparison/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /start over/i }),
      ).toBeVisible();
    });
  });
});
