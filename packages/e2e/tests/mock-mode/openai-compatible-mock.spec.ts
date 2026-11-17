/**
 * Mock mode with the openai-compatible provider (M2).
 *
 * With only an Ollama endpoint configured (no cloud key), the mock client
 * answers for the endpoint's models and its hash embeddings score agreement,
 * so the usual mock flow covers the provider without a server.
 */
import { test, expect } from '@playwright/test';
import { answerCard, ask, closeSettings, openSettings, pickModels, waitForConsensus } from './runHelpers';

const MODELS = ['ollama/llama3.2:3b', 'ollama/qwen2.5:7b', 'ollama/gemma3:4b'];

test.describe('OpenAI-compatible endpoints in mock mode', () => {
  test.setTimeout(120_000);

  test('runs an ensemble on endpoint models with no API keys', async ({ page }) => {
    await page.goto('/workspace');
    const sheet = await openSettings(page);
    await sheet.getByTestId('add-endpoint-ollama').click();
    await expect(sheet.getByTestId('endpoint-ollama')).toHaveAttribute('data-status', 'valid', { timeout: 10_000 });
    await expect(sheet.getByTestId('endpoint-ollama-local')).toBeVisible();
    await closeSettings(page);
    // One connected endpoint is enough to start.
    await expect(page.getByTestId('workspace-setup')).toHaveCount(0);

    await pickModels(page, MODELS);
    await ask(page, 'What is 6 times 7?');

    for (const model of MODELS) {
      await expect(answerCard(page, model)).toBeVisible({ timeout: 30_000 });
    }
    await expect(answerCard(page, MODELS[0]!)).toContainText('Ollama');
    await expect(page.getByTestId('agreement-pair')).toHaveCount(3, { timeout: 60_000 });
    await waitForConsensus(page, 60_000);
  });

  test('removes an endpoint and its models', async ({ page }) => {
    await page.goto('/workspace');
    const sheet = await openSettings(page);
    await sheet.getByTestId('add-endpoint-ollama').click();
    await sheet.getByTestId('add-endpoint-ollama').click();
    await expect(sheet.getByTestId('endpoint-ollama-2')).toBeVisible();
    await sheet.getByTestId('endpoint-ollama-2-remove').click();
    await expect(sheet.getByTestId('endpoint-ollama-2')).toHaveCount(0);
    await expect(sheet.getByTestId('endpoint-ollama')).toBeVisible();
  });
});
