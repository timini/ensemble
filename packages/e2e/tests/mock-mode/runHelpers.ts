/**
 * Shared steps for mock-mode runs in the workspace: configure keys in the
 * settings sheet, pick models in the composer and ask. `mockErrors` uses the
 * app's mock-only query parameter (see
 * packages/app/src/lib/mockErrorScenarios.ts).
 */
import { expect, type Locator, type Page } from '@playwright/test';

interface RunOptions {
  models: string[];
  prompt?: string;
  mockErrors?: string;
  /** Providers to configure keys for. Defaults to OpenAI plus the models' providers. */
  keyProviders?: string[];
  /** Consensus method to pick before asking. Defaults to the stored one (standard). */
  method?: 'standard' | 'majority' | 'elo' | 'council';
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

export function providerOf(model: string): string {
  return PROVIDER_BY_PREFIX.find(([prefix]) => model.startsWith(prefix))?.[1] ?? 'openai';
}

/** "1 API key configured", "2 API keys configured" and so on. */
export function keysConfigured(count: number): RegExp {
  return count === 1 ? /1 API key configured/i : new RegExp(`${count} API keys configured`, 'i');
}

/**
 * Empties browser storage except for the finished onboarding, and reloads,
 * so a test starts as a returning visitor with nothing set up.
 */
export async function resetStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('ensemble-ai-store', JSON.stringify({ onboardingDone: true }));
  });
  await page.reload();
}

/** The settings sheet, opened from the header. */
export async function openSettings(page: Page): Promise<Locator> {
  await page.getByTestId('app-shell-settings').click();
  const sheet = page.getByTestId('settings-sheet');
  await expect(sheet).toBeVisible();
  return sheet;
}

export async function closeSettings(page: Page) {
  await page.getByTestId('settings-sheet-close').click();
  await expect(page.getByTestId('settings-sheet')).toBeHidden();
  // Settings opened from the URL (`?panel=settings`) drop the panel on close,
  // so a reload does not open them again.
  await expect(page).not.toHaveURL(/[?&]panel=/);
}

/**
 * Opens the workspace with settings open (as /config does), fills a mock key
 * for each provider, waits for each to validate and closes settings.
 */
export async function configureKeys(page: Page, providers: string[], mockErrors?: string) {
  const query = mockErrors ? `&mockErrors=${encodeURIComponent(mockErrors)}` : '';
  await page.goto(`/workspace?panel=settings${query}`);
  const sheet = page.getByTestId('settings-sheet');
  await expect(sheet).toBeVisible();
  for (const [index, provider] of providers.entries()) {
    await sheet.locator(`[data-provider="${provider}"] input`).fill(`sk-test-${provider}-key`);
    await expect(sheet.getByText(keysConfigured(index + 1))).toBeVisible();
  }
  await closeSettings(page);
}

/** Opens the model picker in the composer. */
export async function openModelPicker(page: Page): Promise<Locator> {
  const panel = page.getByTestId('model-picker-panel');
  if (!(await panel.isVisible())) await page.getByTestId('model-picker-trigger').click();
  await expect(panel).toBeVisible();
  return panel;
}

/** A model in the open picker, by id. */
export function pickerOption(page: Page, model: string): Locator {
  return page.locator(`[data-testid="model-picker-option"][data-model-id="${model}"]`);
}

/** Adds models by id through the composer's picker, then closes it. */
export async function pickModels(page: Page, models: string[]) {
  await openModelPicker(page);
  for (const model of models) await pickerOption(page, model).click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('model-picker-panel')).toBeHidden();
}

/** The chip of a model in the composer. */
export function modelChip(page: Page, model: string): Locator {
  return page.locator(`[data-testid="model-chip"][data-model-id="${model}"]`);
}

/**
 * Configures a mock key for OpenAI and for every provider the models need
 * (or for `keyProviders` when given), then adds the models to the composer.
 */
export async function selectMockModels(page: Page, models: string[], mockErrors?: string, keyProviders?: string[]) {
  const providers = keyProviders ?? [...new Set(['openai', ...models.map(providerOf)])];
  await configureKeys(page, providers, mockErrors);
  await pickModels(page, models);
}

/** Picks a consensus method in the composer's method menu. */
export async function chooseMethod(page: Page, method: string) {
  await page.getByTestId('method-menu-trigger').click();
  await page.getByTestId(`method-option-${method}`).click();
  await expect(page.getByTestId('method-menu-panel')).toBeHidden();
  await expect(page.getByTestId('method-menu-trigger')).toContainText(new RegExp(method === 'elo' ? 'Ranked' : method, 'i'));
}

/** Types the question and asks. */
export async function ask(page: Page, prompt: string) {
  await page.getByTestId('composer-prompt').fill(prompt);
  await page.getByTestId('composer-submit').click();
  await expect(page.getByTestId('run-result')).toBeVisible();
}

export async function startMockRun(
  page: Page,
  { models, prompt = 'What is 6 times 7?', mockErrors, keyProviders, method }: RunOptions,
) {
  await selectMockModels(page, models, mockErrors, keyProviders);
  if (method) await chooseMethod(page, method);
  await ask(page, prompt);
}

/** The answer card of one model (by id) or manual answer. */
export function answerCard(page: Page, id: string): Locator {
  return page.locator(`[data-testid="answer-card"][data-answer-id="${id}"]`);
}

/** Every answer card added by hand. */
export function manualAnswerCards(page: Page): Locator {
  return page.locator('[data-testid="answer-card"][data-kind="manual"]');
}

export function consensus(page: Page): Locator {
  return page.getByTestId('consensus-answer');
}

export function agreement(page: Page): Locator {
  return page.getByTestId('agreement-summary');
}

/** Waits for the consensus to be written. */
export async function waitForConsensus(page: Page, timeout = 30_000) {
  await expect(consensus(page)).toHaveAttribute('data-status', 'success', { timeout });
}

/** Adds an answer by hand from the composer's options menu. */
export async function addManualAnswer(page: Page, label: string, text: string) {
  await page.getByTestId('composer-options-trigger').click();
  await page.getByTestId('composer-option-manual').click();
  const modal = page.getByTestId('manual-response-modal');
  await expect(modal).toBeVisible();
  await modal.getByTestId('model-name-input').fill(label);
  await modal.getByTestId('model-provider-input').fill('Reference');
  await modal.getByTestId('response-textarea').fill(text);
  await modal.getByTestId('submit-button').click();
  await expect(modal).toBeHidden();
}
