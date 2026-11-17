/**
 * Free Mode Happy Path E2E Test
 *
 * The complete sunny-day journey with all 5 providers in the workspace:
 * enter all 5 keys in settings, pick one model per provider, ask with the
 * Standard method, then check every answer, the agreement score and the
 * consensus.
 *
 * Requires all 5 TEST_*_API_KEY env vars to be set.
 * Skips gracefully when any key is missing.
 */

import { test, expect } from '@playwright/test';
import { answerCards, ask, configureKeys, selectModel } from './helpers';

const OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.TEST_ANTHROPIC_API_KEY;
const GOOGLE_API_KEY = process.env.TEST_GOOGLE_API_KEY;
const XAI_API_KEY = process.env.TEST_XAI_API_KEY;
const PERPLEXITY_API_KEY = process.env.TEST_PERPLEXITY_API_KEY;

const hasAllKeys = OPENAI_API_KEY && ANTHROPIC_API_KEY && GOOGLE_API_KEY && XAI_API_KEY && PERPLEXITY_API_KEY;

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
const API_KEYS: Array<[string, string | undefined]> = [
  ['openai', OPENAI_API_KEY],
  ['anthropic', ANTHROPIC_API_KEY],
  ['google', GOOGLE_API_KEY],
  ['xai', XAI_API_KEY],
  ['perplexity', PERPLEXITY_API_KEY],
];

/** Model id prefixes, one per provider. */
const PROVIDERS = [
  { modelPrefix: 'gpt', label: 'OpenAI' },
  { modelPrefix: 'claude', label: 'Anthropic' },
  { modelPrefix: 'gemini', label: 'Google' },
  { modelPrefix: 'grok', label: 'XAI' },
  { modelPrefix: 'perplexity', label: 'Perplexity' },
];

test.describe('Free Mode — Happy Path', () => {
  test.skip(!hasAllKeys, 'Skipping — one or more TEST_*_API_KEY env vars not set (need all 5 providers)');

  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('5 providers → Standard summarisation → all responses, agreement analysis, and consensus load', async ({
    page,
  }) => {
    test.setTimeout(TIMEOUT.TEST);

    await test.step('Enter all 5 API keys in settings', async () => {
      await configureKeys(page, API_KEYS.map(([p, k]) => [p, k!]), TIMEOUT.API_VALIDATION);
    });

    await test.step('Pick one model per provider', async () => {
      for (const { modelPrefix } of PROVIDERS) {
        await selectModel(page, modelPrefix, TIMEOUT.MODEL_VISIBLE);
      }
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('model-chip')).toHaveCount(5);
    });

    await test.step('Standard is the default method; ask', async () => {
      await expect(page.getByTestId('method-menu-trigger')).toContainText('Standard');
      await ask(page, 'What are the main benefits of exercise? Give a short answer.');
    });

    await test.step('All 5 provider answers complete', async () => {
      for (const { modelPrefix, label } of PROVIDERS) {
        const card = answerCards(page, modelPrefix).first();
        await expect(card).toBeVisible({ timeout: TIMEOUT.RESPONSE_VISIBLE });
        await expect(card).toHaveAttribute('data-status', 'complete', { timeout: TIMEOUT.RESPONSE_COMPLETE });
        const text = await card.textContent();
        expect(text && text.length > 10, `${label} response should have real content`).toBe(true);
      }
      await expect(page.locator('[data-testid="answer-card"][data-status="error"]')).toHaveCount(0);
    });

    await test.step('The agreement score loads', async () => {
      const agreement = page.getByTestId('agreement-summary');
      await expect(agreement).toHaveAttribute('data-status', 'ready', { timeout: TIMEOUT.AGREEMENT_VISIBLE });
      await expect(agreement.getByTestId('agreement-pair')).toHaveCount(10);
    });

    await test.step('The consensus loads', async () => {
      const consensus = page.getByTestId('consensus-answer');
      await expect(consensus).toHaveAttribute('data-status', 'success', { timeout: TIMEOUT.CONSENSUS_VISIBLE });
      const text = await consensus.textContent();
      expect(text && text.length > 50, 'Consensus should have substantial content').toBe(true);
    });
  });
});
