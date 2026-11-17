/**
 * Shared steps for mock-mode runs: configure keys, pick models by id and
 * submit a prompt. `mockErrors` uses the app's mock-only query parameter
 * (see packages/app/src/lib/mockErrorScenarios.ts).
 */
import { expect, type Locator, type Page } from '@playwright/test';

interface RunOptions {
  models: string[];
  prompt?: string;
  mockErrors?: string;
  /** Providers to configure keys for. Defaults to OpenAI plus the models' providers. */
  keyProviders?: string[];
}

/** Provider of a mock model id, from its prefix. */
const PROVIDER_BY_PREFIX: Array<[string, string]> = [
  ['gpt', 'openai'],
  ['claude', 'anthropic'],
  ['gemini', 'google'],
  ['grok', 'xai'],
  ['deepseek', 'deepseek'],
  ['perplexity', 'perplexity'],
];

function providerOf(model: string): string {
  return PROVIDER_BY_PREFIX.find(([prefix]) => model.startsWith(prefix))?.[1] ?? 'openai';
}

/**
 * Configure a mock key for OpenAI and for every provider the models need
 * (or for `keyProviders` when given), then select the models on /ensemble.
 * Leaves the page on /ensemble.
 */
export async function selectMockModels(
  page: Page,
  models: string[],
  mockErrors?: string,
  keyProviders?: string[],
) {
  const query = mockErrors ? `?mockErrors=${encodeURIComponent(mockErrors)}` : '';
  await page.goto(`/config${query}`);
  await page.locator('[data-mode="free"]').click();
  const providers = keyProviders ?? [...new Set(['openai', ...models.map(providerOf)])];
  for (const [index, provider] of providers.entries()) {
    await page.locator(`[data-provider="${provider}"] input`).fill(`sk-test-${provider}-key`);
    const label = index === 0 ? /1 API key configured/i : new RegExp(`${index + 1} API keys configured`, 'i');
    await expect(page.getByText(label)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/\/ensemble/);

  for (const model of models) {
    await page.getByTestId(`model-card-${model}`).click();
  }
}

export async function startMockRun(
  page: Page,
  { models, prompt = 'What is 6 times 7?', mockErrors, keyProviders }: RunOptions,
) {
  await selectMockModels(page, models, mockErrors, keyProviders);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/\/prompt/);

  await page.getByTestId('prompt-textarea').fill(prompt);
  await page.getByRole('button', { name: /generate responses/i }).click();
  await expect(page).toHaveURL(/\/review/);
}

/** The response card of one model, matched by its API id. */
export function responseCard(page: Page, model: string): Locator {
  return page.locator(`[data-testid^="response-card-"][data-testid*="-${model}-"]`);
}
