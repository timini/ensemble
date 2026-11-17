/**
 * Agreement without an embeddings provider.
 *
 * Only OpenAI and Google keys (or an endpoint embedding model) can produce
 * embeddings. With an Anthropic key alone, the estimate plans no embedding
 * calls and the agreement card says why there is no score, with a way into
 * settings.
 */
import { test, expect } from '@playwright/test';
import { selectMockModels, startMockRun } from './runHelpers';

const MODELS = ['claude-sonnet-5-5', 'claude-haiku-5-5'];

test.describe('Agreement without an embeddings provider', () => {
  test.setTimeout(90_000);

  test('the estimate plans no embedding calls', async ({ page }) => {
    await selectMockModels(page, MODELS, undefined, ['anthropic']);
    await page.getByTestId('composer-prompt').fill('What is 6 times 7?');
    // 2 answers and 1 consensus call, no embedding calls.
    await expect(page.getByTestId('method-menu-trigger')).toContainText('3 calls');
  });

  test('the agreement card explains why there is no score and opens settings', async ({ page }) => {
    await startMockRun(page, { models: MODELS, keyProviders: ['anthropic'] });

    const unavailable = page.getByTestId('agreement-unavailable');
    await expect(unavailable).toBeVisible({ timeout: 60_000 });
    await expect(unavailable).toHaveAttribute('data-reason', 'noEmbeddings');
    await expect(page.getByTestId('agreement-pair')).toHaveCount(0);

    await page.getByTestId('agreement-open-settings').click();
    await expect(page.getByTestId('settings-sheet')).toBeVisible();
  });
});
