/**
 * Free mode with only an OpenAI-compatible endpoint (M2).
 *
 * The app runs in Free mode (real provider clients, no mock) against the fake
 * OpenAI-compatible server in fixtures/fake-openai-server.mjs, which stands in
 * for a local Ollama. No cloud key is configured. Three models answer, the
 * endpoint's embedding model scores agreement for real, and the summarizer
 * on the same endpoint writes the consensus.
 *
 * The fake server gives tiny-alpha and tiny-beta the same answer and
 * tiny-gamma an unrelated one, so their pair scores 100% and the others less.
 */
import { test, expect, type Page } from '@playwright/test';

const FAKE_BASE_URL = 'http://localhost:11499/v1';
// The Ollama preset pointed at the fake server: a local endpoint, so calls cost nothing.
const MODELS = ['ollama/tiny-alpha', 'ollama/tiny-beta', 'ollama/tiny-gamma'];

async function fakeServerCounts(page: Page): Promise<Record<string, number>> {
  const response = await page.request.get('http://localhost:11499/__requests');
  return (await response.json()) as Record<string, number>;
}

test.describe('Free mode with a local OpenAI-compatible endpoint', () => {
  test.setTimeout(180_000);

  test('runs a 3-model ensemble with real agreement scores and no cloud keys', async ({ page }) => {
    await page.request.post('http://localhost:11499/__reset');

    await test.step('Configure only an OpenAI-compatible endpoint', async () => {
      await page.goto('/config');
      await page.locator('[data-mode="free"]').click();
      await page.getByTestId('add-endpoint-ollama').click();

      const endpoint = page.getByTestId('endpoint-ollama');
      await endpoint.getByTestId('endpoint-ollama-base-url').fill(FAKE_BASE_URL);
      await endpoint.getByTestId('endpoint-ollama-embedding-model').fill('tiny-embed');
      await expect(endpoint).toHaveAttribute('data-status', 'valid', { timeout: 15_000 });
      await expect(endpoint.getByTestId('endpoint-ollama-status')).toHaveText('Connected. 4 models available.');

      // No cloud key, yet the endpoint embedding model scores agreement.
      await expect(page.getByTestId('embeddings-provider-active')).toContainText('OpenAI-compatible endpoint');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page).toHaveURL(/\/ensemble/);
    });

    await test.step('Pick three endpoint models and a summarizer', async () => {
      for (const model of MODELS) {
        await page.getByTestId(`model-card-${model}`).click();
      }
      await page.getByTestId(`summarizer-button-${MODELS[0]}`).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page).toHaveURL(/\/prompt/);
    });

    await test.step('Show the run as free before submitting', async () => {
      await page.getByTestId('prompt-textarea').fill('What is the capital of France?');
      await expect(page.getByTestId('run-cost-amount')).toHaveText('Estimated cost: $0.00 to $0.00');
      await expect(page.getByTestId('run-cost-local')).toBeVisible();
      await page.getByRole('button', { name: /generate responses/i }).click();
      await expect(page).toHaveURL(/\/review/);
    });

    await test.step('Score agreement with real embeddings from the endpoint', async () => {
      const analysis = page.getByTestId('agreement-analysis');
      await expect(analysis).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId('agreement-response-count')).toHaveText('3');
      await expect(page.getByTestId('agreement-comparison-count')).toHaveText('3');

      const similarities = await analysis.getByTestId('pairwise-similarity').allTextContents();
      expect(similarities).toHaveLength(3);
      // The two identical answers agree fully; the unrelated one does not.
      expect(similarities).toContain('100%');
      expect(similarities.filter((value) => value !== '100%')).toHaveLength(2);
    });

    await test.step('Write the consensus with the endpoint summarizer', async () => {
      await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success', {
        timeout: 60_000,
      });
      await expect(page.getByTestId('run-cost-local')).toBeVisible();
    });

    const counts = await fakeServerCounts(page);
    expect(counts['POST /v1/chat/completions']).toBeGreaterThanOrEqual(4);
    expect(counts['POST /v1/embeddings']).toBeGreaterThanOrEqual(3);
  });
});
