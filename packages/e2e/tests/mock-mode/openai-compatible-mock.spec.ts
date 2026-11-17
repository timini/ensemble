/**
 * Mock mode with the openai-compatible provider (M2).
 *
 * With only an Ollama endpoint configured (no cloud key), the mock client
 * answers for the endpoint's models and its hash embeddings score agreement,
 * so the usual mock flow covers the provider without a server.
 */
import { test, expect } from '@playwright/test';
import { responseCard } from './runHelpers';

const MODELS = ['ollama/llama3.2:3b', 'ollama/qwen2.5:7b', 'ollama/gemma3:4b'];

test.describe('OpenAI-compatible endpoints in mock mode', () => {
  test.setTimeout(120_000);

  test('runs an ensemble on endpoint models with no API keys', async ({ page }) => {
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();
    await page.getByTestId('add-endpoint-ollama').click();
    await expect(page.getByTestId('endpoint-ollama')).toHaveAttribute('data-status', 'valid', { timeout: 10_000 });
    await expect(page.getByTestId('endpoint-ollama-local')).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/\/ensemble/);

    for (const model of MODELS) {
      await page.getByTestId(`model-card-${model}`).click();
    }
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByTestId('prompt-textarea').fill('What is 6 times 7?');
    await page.getByRole('button', { name: /generate responses/i }).click();
    await expect(page).toHaveURL(/\/review/);

    for (const model of MODELS) {
      await expect(responseCard(page, model)).toBeVisible({ timeout: 30_000 });
    }
    await expect(page.getByTestId('agreement-comparison-count')).toHaveText('3', { timeout: 60_000 });
    await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success', { timeout: 60_000 });
  });

  test('removes an endpoint and its models', async ({ page }) => {
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();
    await page.getByTestId('add-endpoint-ollama').click();
    await page.getByTestId('add-endpoint-ollama').click();
    await expect(page.getByTestId('endpoint-ollama-2')).toBeVisible();
    await page.getByTestId('endpoint-ollama-2-remove').click();
    await expect(page.getByTestId('endpoint-ollama-2')).toHaveCount(0);
    await expect(page.getByTestId('endpoint-ollama')).toBeVisible();
  });
});
