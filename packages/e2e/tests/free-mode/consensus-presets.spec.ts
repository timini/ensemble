/**
 * Free Mode Consensus Presets E2E Tests
 *
 * Tests the Consensus Presets UI (Standard / ELO) through the full workflow
 * using REAL API keys. Requires 3 providers so ELO can be enabled.
 *
 * Skipped in CI unless API key secrets are configured.
 */

import { test, expect } from '@playwright/test';
import { fillAndValidateKey, selectModel } from './helpers';

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
} as const;

test.describe('Consensus Presets (Free Mode)', () => {
  test.skip(!hasRequiredKeys, 'Skipping — requires TEST_OPENAI_API_KEY, TEST_ANTHROPIC_API_KEY, and TEST_GOOGLE_API_KEY');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should show ELO disabled with 2 models and enabled with 3', async ({ page }) => {
    test.setTimeout(TIMEOUT.TEST);

    // ==========================================
    // STEP 1: Config Page — enter 3 API keys
    // ==========================================
    await test.step('Configure Free mode with 3 API keys', async () => {
      await page.goto('/config');
      await page.locator('[data-mode="free"]').click();
      await expect(page.locator('[data-mode="free"]')).toHaveAttribute('data-selected', 'true');

      await fillAndValidateKey(page, 'openai', OPENAI_API_KEY!, 1);
      await fillAndValidateKey(page, 'anthropic', ANTHROPIC_API_KEY!, 2);
      await fillAndValidateKey(page, 'google', GOOGLE_API_KEY!, 3);

      await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    });

    // ==========================================
    // STEP 2: Ensemble Page — select only 2 models first
    // ==========================================
    await test.step('Select 2 models and verify ELO is disabled', async () => {
      await expect(page).toHaveURL('/ensemble');
      await expect(page.getByTestId('model-selection-list')).toBeVisible();

      // Select one OpenAI model and one Google model
      await selectModel(page, 'gpt', TIMEOUT.MODEL_VISIBLE);
      await selectModel(page, 'gemini', TIMEOUT.MODEL_VISIBLE);

      // Verify 2 models selected
      const selectedCards = page.locator('[data-testid^="model-card-"][data-selected="true"]');
      await expect(selectedCards).toHaveCount(2);

      await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    });

    // ==========================================
    // STEP 3: Prompt Page — verify ELO disabled with 2 models
    // ==========================================
    await test.step('Verify ELO is disabled with only 2 models', async () => {
      await expect(page).toHaveURL('/prompt');

      // Standard preset should be checked by default
      await expect(page.getByTestId('preset-standard')).toBeChecked();

      // ELO should be disabled (requires 3+ models)
      const eloRadio = page.getByTestId('preset-elo');
      await expect(eloRadio).toBeDisabled();
      await expect(page.getByText(/requires at least 3 models/i)).toBeVisible();
    });

    // ==========================================
    // STEP 4: Go back and select a 3rd model
    // ==========================================
    await test.step('Go back to ensemble and select a 3rd model', async () => {
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page).toHaveURL('/ensemble');

      // Select a Claude model as the 3rd
      await selectModel(page, 'claude', TIMEOUT.MODEL_VISIBLE);

      // Verify 3 models selected
      const selectedCards = page.locator('[data-testid^="model-card-"][data-selected="true"]');
      await expect(selectedCards).toHaveCount(3);

      await page.getByRole('button', { name: 'Next', exact: true }).click();
    });

    // ==========================================
    // STEP 5: Prompt Page — verify ELO now enabled, select it
    // ==========================================
    await test.step('Select ELO preset with 3 models and generate', async () => {
      await expect(page).toHaveURL('/prompt');

      // ELO should now be enabled with 3 models
      const eloRadio = page.getByTestId('preset-elo');
      await expect(eloRadio).toBeEnabled();
      await eloRadio.click();
      await expect(eloRadio).toBeChecked();

      // Top N input should appear
      await expect(page.getByTestId('input-top-n')).toBeVisible();

      // Enter prompt
      await page.getByTestId('prompt-textarea').fill('What is 2+2? Reply with just the number.');

      // Generate responses
      await page.getByRole('button', { name: /generate responses/i }).click();
    });

    // ==========================================
    // STEP 6: Review Page — verify responses and consensus
    // ==========================================
    await test.step('Verify responses complete and consensus card appears', async () => {
      await expect(page).toHaveURL('/review');

      // Wait for at least one response to be visible
      const firstCard = page.locator('[data-testid^="response-card-"]').first();
      await expect(firstCard).toBeVisible({ timeout: TIMEOUT.RESPONSE_VISIBLE });

      // Wait for first response to complete
      await expect(firstCard).toHaveAttribute('data-status', 'complete', {
        timeout: TIMEOUT.RESPONSE_COMPLETE,
      });

      // Wait for consensus card to appear
      await expect(page.getByTestId('consensus-card')).toBeVisible({
        timeout: TIMEOUT.RESPONSE_COMPLETE,
      });

      // Verify consensus has content
      const consensusCard = page.getByTestId('consensus-card');
      const text = await consensusCard.textContent();
      expect(text && text.length > 20, 'Consensus card should have meaningful content').toBe(true);
    });
  });
});
