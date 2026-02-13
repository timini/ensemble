/**
 * Shared helpers for free-mode E2E tests.
 */
import { expect, type Page } from '@playwright/test';

/**
 * Known-good model IDs per provider prefix, tried in priority order.
 *
 * Provider APIs may list deprecated models that return 404 errors at generation
 * time (e.g. gemini-1.5-pro, claude-3.5-sonnet). This list ensures we pick
 * models that are currently working.
 *
 * Both dynamic API IDs (e.g. claude-3-5-haiku-20241022) and corrected fallback
 * IDs are included so the helper works regardless of whether the dynamic model
 * fetch succeeded.
 */
const PREFERRED_MODELS: Record<string, string[]> = {
  gpt: ['gpt-4o-mini', 'gpt-4o'],
  claude: [
    'claude-sonnet-4-5-20250514',
    'claude-3-5-haiku-20241022',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
  ],
  gemini: [
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
  ],
  grok: ['grok-2', 'grok-3'],
};

/**
 * Select a known-good model for testing by provider prefix.
 *
 * Tries preferred model IDs in priority order. The first preferred model gets
 * a longer timeout (5s) to allow dynamic models to load and replace the
 * fallback list. Subsequent models get a short timeout (500ms).
 *
 * Falls back to the last available model card for that prefix if no preferred
 * models are found.
 */
export async function selectModel(
  page: Page,
  prefix: string,
  timeout: number,
): Promise<void> {
  // Wait for at least one model card to appear
  await expect(
    page.locator(`[data-testid^="model-card-${prefix}-"]`).first(),
  ).toBeVisible({ timeout });

  // Try preferred models in priority order
  const preferred = PREFERRED_MODELS[prefix] ?? [];
  for (let i = 0; i < preferred.length; i++) {
    const card = page.getByTestId(`model-card-${preferred[i]}`);
    // Give the first check more time for dynamic models to load
    const waitMs = i === 0 ? 5000 : 500;
    try {
      await expect(card).toBeVisible({ timeout: waitMs });
      await card.click();
      return;
    } catch {
      // Not found, try next
    }
  }

  // Fallback: pick last available (newer models tend to be listed later)
  await page.locator(`[data-testid^="model-card-${prefix}-"]`).last().click();
}

/** Fill an API key input by provider and wait for the configured count. */
export async function fillAndValidateKey(
  page: Page,
  provider: string,
  value: string,
  expectedCount: number,
  timeout = 60_000,
): Promise<void> {
  await page.locator(`[data-provider="${provider}"] input`).fill(value);
  const label =
    expectedCount === 1
      ? /1 API key configured/i
      : new RegExp(`${expectedCount} API keys configured`, 'i');
  await expect(page.getByText(label)).toBeVisible({ timeout });
}
