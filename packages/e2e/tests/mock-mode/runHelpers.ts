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
}

export async function startMockRun(page: Page, { models, prompt = 'What is 6 times 7?', mockErrors }: RunOptions) {
  const query = mockErrors ? `?mockErrors=${encodeURIComponent(mockErrors)}` : '';
  await page.goto(`/config${query}`);
  await page.locator('[data-mode="free"]').click();
  await page.locator('[data-provider="openai"] input').fill('sk-test-openai-key');
  await expect(page.getByText(/1 API key configured/i)).toBeVisible();
  if (models.some((m) => m.startsWith('claude'))) {
    await page.locator('[data-provider="anthropic"] input').fill('sk-ant-test-key');
    await expect(page.getByText(/2 API keys configured/i)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/\/ensemble/);

  for (const model of models) {
    await page.getByTestId(`model-card-${model}`).click();
  }
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
