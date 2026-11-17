/**
 * Saved ensembles (presets) on /ensemble (T178).
 *
 * The current selection can be saved under a name, loaded back later and
 * deleted. Saved ensembles are kept in localStorage with the rest of the
 * store, so they survive a reload.
 */
import { test, expect, type Page } from '@playwright/test';
import { selectMockModels } from './runHelpers';

const STORE_KEY = 'ensemble-ai-store';

function savedPreset(page: Page, name: string) {
  return page.getByTestId('saved-preset').filter({ hasText: name });
}

async function storedPresetNames(page: Page): Promise<string[]> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { savedEnsembles?: Array<{ name: string }> };
    return (parsed.savedEnsembles ?? []).map((preset) => preset.name);
  }, STORE_KEY);
}

async function saveCurrentEnsemble(page: Page, name: string) {
  await page.getByTestId('ensemble-name-input').fill(name);
  await page.getByTestId('save-ensemble-button').click();
  await expect(savedPreset(page, name)).toBeVisible();
}

test.describe('Saved ensembles', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'claude-haiku-5-5']);
    await page.getByTestId('summarizer-button-claude-haiku-5-5').click();
  });

  test('saving is disabled until models are selected', async ({ page }) => {
    await page.getByTestId('clear-all-models').click();
    await page.getByTestId('ensemble-name-input').fill('Empty');
    await expect(page.getByTestId('save-ensemble-button')).toBeDisabled();
  });

  test('saves the current ensemble and keeps it after a reload', async ({ page }) => {
    await saveCurrentEnsemble(page, 'Quick pair');

    const preset = savedPreset(page, 'Quick pair');
    await expect(preset).toContainText('GPT-6 Astra');
    await expect(preset).toContainText('Claude Haiku 5.5');
    await expect.poll(() => storedPresetNames(page)).toEqual(['Quick pair']);

    await page.reload();
    await expect(savedPreset(page, 'Quick pair')).toBeVisible();
  });

  test('loading a saved ensemble restores its models and summarizer', async ({ page }) => {
    await saveCurrentEnsemble(page, 'Quick pair');

    await page.getByTestId('clear-all-models').click();
    await expect(page.getByTestId('model-card-gpt-6-astra')).not.toHaveAttribute('data-selected', 'true');
    await page.getByTestId('model-card-gpt-6-luna').click();

    await savedPreset(page, 'Quick pair').getByTestId('use-preset-button').click();

    await expect(page.getByTestId('model-card-gpt-6-astra')).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('model-card-claude-haiku-5-5')).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('model-card-gpt-6-luna')).not.toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('model-card-claude-haiku-5-5')).toHaveAttribute('data-summarizer', 'true');
    await expect(page.getByTestId('model-selection-counter')).toContainText('2');
  });

  test('saving under an existing name replaces that ensemble', async ({ page }) => {
    await saveCurrentEnsemble(page, 'Quick pair');
    await page.getByTestId('model-card-gpt-6-luna').click();
    await saveCurrentEnsemble(page, 'Quick pair');

    await expect(page.getByTestId('saved-preset')).toHaveCount(1);
    await expect(savedPreset(page, 'Quick pair')).toContainText('GPT-6 Luna');
    await expect.poll(() => storedPresetNames(page)).toEqual(['Quick pair']);
  });

  test('deletes a saved ensemble and it stays deleted after a reload', async ({ page }) => {
    await saveCurrentEnsemble(page, 'Keep me');
    await saveCurrentEnsemble(page, 'Delete me');

    await savedPreset(page, 'Delete me').getByTestId('delete-preset-button').click();

    await expect(savedPreset(page, 'Delete me')).toHaveCount(0);
    await expect(savedPreset(page, 'Keep me')).toBeVisible();
    await expect.poll(() => storedPresetNames(page)).toEqual(['Keep me']);

    await page.reload();
    await expect(savedPreset(page, 'Delete me')).toHaveCount(0);
    await expect(savedPreset(page, 'Keep me')).toBeVisible();
    // Deleting a preset leaves the current selection alone.
    await expect(page.getByTestId('model-card-gpt-6-astra')).toHaveAttribute('data-selected', 'true');
  });
});
