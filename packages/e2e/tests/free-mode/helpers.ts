/**
 * Shared helpers for free-mode E2E tests in the workspace (/workspace).
 */
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Known-good model IDs per provider prefix, tried in priority order.
 *
 * Provider APIs may list deprecated models that return 404 errors at generation
 * time (e.g. gemini-1.5-pro, claude-3-5-sonnet). This list ensures we pick
 * models that are currently working. Cheap models come first to keep the
 * post-deploy run inexpensive.
 *
 * The ids appear in both the dynamic provider lists and the fallback list, so
 * the helper works whether or not the dynamic model fetch succeeded.
 */
const PREFERRED_MODELS: Record<string, string[]> = {
  gpt: ['gpt-6-luna', 'gpt-6-astra'],
  claude: ['claude-haiku-5-5', 'claude-sonnet-5-5'],
  gemini: ['gemini-3.5-flash-lite', 'gemini-4-hydrogen'],
  grok: ['grok-4.3', 'grok-4.7'],
  perplexity: ['perplexity-fast', 'perplexity-low'],
};

/** "1 API key configured", "2 API keys configured" and so on. */
function keysConfigured(count: number): RegExp {
  return count === 1 ? /1 API key configured/i : new RegExp(`${count} API keys configured`, 'i');
}

/** A model option in the composer's picker, by id. */
export function pickerOption(page: Page, model: string): Locator {
  return page.locator(`[data-testid="model-picker-option"][data-model-id="${model}"]`);
}

/** Every option in the picker whose id starts with `prefix`. */
function optionsWithPrefix(page: Page, prefix: string): Locator {
  return page.locator(`[data-testid="model-picker-option"][data-model-id^="${prefix}"]`);
}

/** The answer card of a model, by id prefix (`gemini-`, `gpt-`). */
export function answerCards(page: Page, prefix: string): Locator {
  return page.locator(`[data-testid="answer-card"][data-answer-id^="${prefix}"]`);
}

/**
 * Opens settings (as /config does), fills each key and waits for it to
 * validate against the provider, then closes settings.
 */
export async function configureKeys(page: Page, keys: Array<[provider: string, key: string]>, timeout = 60_000) {
  await page.goto('/workspace?panel=settings');
  const sheet = page.getByTestId('settings-sheet');
  await expect(sheet).toBeVisible();
  for (const [index, [provider, key]] of keys.entries()) {
    await sheet.locator(`[data-provider="${provider}"] input`).fill(key);
    await expect(sheet.getByText(keysConfigured(index + 1))).toBeVisible({ timeout });
  }
  await sheet.getByTestId('settings-sheet-close').click();
  await expect(sheet).toBeHidden();
  await expect(page).not.toHaveURL(/[?&]panel=/);
}

/** Opens the model picker in the composer if it is closed. */
export async function openModelPicker(page: Page) {
  const panel = page.getByTestId('model-picker-panel');
  if (!(await panel.isVisible())) await page.getByTestId('model-picker-trigger').click();
  await expect(panel).toBeVisible();
}

/**
 * Adds a known-good model for a provider prefix through the picker.
 *
 * Tries preferred model IDs in priority order. The first gets a longer
 * timeout (5 s) so dynamic models can load and replace the fallback list.
 * Falls back to the last listed model with that prefix.
 */
export async function selectModel(page: Page, prefix: string, timeout: number): Promise<void> {
  await openModelPicker(page);
  await expect(optionsWithPrefix(page, prefix).first()).toBeVisible({ timeout });

  const preferred = PREFERRED_MODELS[prefix] ?? [];
  for (let i = 0; i < preferred.length; i++) {
    const option = pickerOption(page, preferred[i]!);
    try {
      await expect(option).toBeVisible({ timeout: i === 0 ? 5000 : 500 });
      if ((await option.getAttribute('aria-pressed')) === 'true') continue;
      await option.click();
      return;
    } catch {
      // Not listed, try the next one.
    }
  }
  await optionsWithPrefix(page, prefix).last().click();
}

/** Closes the picker, types the question and asks. */
export async function ask(page: Page, prompt: string) {
  await page.keyboard.press('Escape');
  await page.getByTestId('composer-prompt').fill(prompt);
  await page.getByTestId('composer-submit').click();
  await expect(page.getByTestId('run-result')).toBeVisible();
}
