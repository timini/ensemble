/**
 * Agreement without an embeddings provider.
 *
 * Only OpenAI and Google keys can produce embeddings. With an Anthropic key
 * alone, the prompt page plans no embedding calls and the review page says
 * why there is no agreement score instead of showing one.
 */
import { test, expect } from '@playwright/test';
import { selectMockModels, startMockRun } from './runHelpers';

const MODELS = ['claude-sonnet-5-5', 'claude-haiku-5-5'];

test.describe('Agreement without an embeddings provider', () => {
  test.setTimeout(90_000);

  test('the estimate plans no embedding calls', async ({ page }) => {
    await selectMockModels(page, MODELS, undefined, ['anthropic']);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/\/prompt/);
    await page.getByTestId('prompt-textarea').fill('What is 6 times 7?');

    const summary = page.getByTestId('run-cost-summary');
    await expect(summary).toContainText('3 model calls');
    await expect(summary).toContainText('0 embedding calls');
  });

  test('the review page explains why there is no score', async ({ page }) => {
    await startMockRun(page, { models: MODELS, keyProviders: ['anthropic'] });

    await expect(page.getByTestId('agreement-unavailable')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('agreement-analysis')).toHaveCount(0);
  });
});
