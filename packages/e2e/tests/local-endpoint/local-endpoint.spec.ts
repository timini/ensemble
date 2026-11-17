/**
 * Free mode with only an OpenAI-compatible endpoint (M2).
 *
 * The app runs in Free mode (real provider clients, no mock) against the fake
 * OpenAI-compatible server in fixtures/fake-openai-server.mjs, which stands in
 * for a local Ollama. The app's Ollama detection is pointed at it with
 * NEXT_PUBLIC_OLLAMA_URL. No cloud key is configured. Three models answer,
 * the endpoint's embedding model scores agreement for real, and the
 * summarizer on the same endpoint writes the consensus.
 *
 * The fake server gives tiny-alpha and tiny-beta the same answer and
 * tiny-gamma an unrelated one, so their pair scores 100% and the others less.
 */
import { test, expect, type Page } from '@playwright/test';

const FAKE_ROOT = 'http://localhost:11499';
const FAKE_BASE_URL = `${FAKE_ROOT}/v1`;
// The Ollama preset pointed at the fake server: a local endpoint, so calls cost nothing.
const MODELS = ['ollama/tiny-alpha', 'ollama/tiny-beta', 'ollama/tiny-gamma'];

async function fakeServerCounts(page: Page): Promise<Record<string, number>> {
  const response = await page.request.get(`${FAKE_ROOT}/__requests`);
  return (await response.json()) as Record<string, number>;
}

/** From a configured /config page: pick 3 endpoint models, run, and check the scores. */
async function runThreeModelEnsemble(page: Page) {
  await test.step('Continue with no cloud key', async () => {
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
}

test.describe('Free mode with a local OpenAI-compatible endpoint', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await page.request.post(`${FAKE_ROOT}/__reset`);
  });

  test('detects a running Ollama and runs a 3-model ensemble from one click', async ({ page }) => {
    await test.step('Offer the running Ollama with its installed models', async () => {
      await page.goto('/config');
      await page.locator('[data-mode="free"]').click();

      const notice = page.getByTestId('ollama-notice');
      await expect(notice).toHaveAttribute('data-state', 'found', { timeout: 15_000 });
      await expect(notice.getByTestId('ollama-notice-models')).toHaveText(
        '3 chat models installed: tiny-alpha, tiny-beta, tiny-gamma.',
      );
      await expect(notice.getByTestId('ollama-notice-embedding')).toHaveText('Agreement scores will use tiny-embed.');
    });

    await test.step('Add it with one click', async () => {
      await page.getByTestId('ollama-notice-add').click();
      await expect(page.getByTestId('ollama-notice')).toHaveCount(0);

      const endpoint = page.getByTestId('endpoint-ollama');
      await expect(endpoint.getByTestId('endpoint-ollama-base-url')).toHaveValue(FAKE_BASE_URL);
      await expect(endpoint.getByTestId('endpoint-ollama-embedding-model')).toHaveValue('tiny-embed');
      await expect(endpoint).toHaveAttribute('data-status', 'valid', { timeout: 15_000 });
      await expect(endpoint.getByTestId('endpoint-ollama-status')).toHaveText('Connected. 4 models available.');
    });

    const counts = await fakeServerCounts(page);
    expect(counts['GET /api/tags']).toBeGreaterThanOrEqual(1);

    await runThreeModelEnsemble(page);
  });

  test('picks the embedding model the server has when the suggested one is missing', async ({ page }) => {
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();
    await page.getByTestId('ollama-notice-dismiss').click();
    await expect(page.getByTestId('ollama-notice')).toHaveCount(0);

    await page.getByTestId('add-endpoint-ollama').click();
    const endpoint = page.getByTestId('endpoint-ollama');
    // The preset suggests nomic-embed-text, which the fake server does not have.
    await expect(endpoint.getByTestId('endpoint-ollama-embedding-model')).toHaveValue('nomic-embed-text');
    await endpoint.getByTestId('endpoint-ollama-base-url').fill(FAKE_BASE_URL);
    await expect(endpoint).toHaveAttribute('data-status', 'valid', { timeout: 15_000 });
    await expect(endpoint.getByTestId('endpoint-ollama-embedding-model')).toHaveValue('tiny-embed');
    await expect(endpoint.getByTestId('endpoint-ollama-embedding-missing')).toHaveCount(0);

    await runThreeModelEnsemble(page);
  });

  test('keeps the offer away after it is dismissed', async ({ page }) => {
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();
    await expect(page.getByTestId('ollama-notice')).toHaveAttribute('data-state', 'found', { timeout: 15_000 });
    await page.getByTestId('ollama-notice-dismiss').click();
    await page.reload();
    await page.locator('[data-mode="free"]').click();
    await expect(page.getByTestId('endpoint-configuration')).toBeVisible();
    // Give detection time to run; the dismissed offer must not come back.
    await page.waitForTimeout(2_000);
    await expect(page.getByTestId('ollama-notice')).toHaveCount(0);
  });
});
