/**
 * Saved ensembles (presets, T178) in the workspace.
 *
 * The composer's options menu saves the current models under a name; the
 * history sidebar lists presets, loads one back and deletes it. Presets are
 * kept in localStorage with the rest of the store, so they survive a reload.
 */
import { test, expect, type Page } from '@playwright/test';
import { chooseMethod, modelChip, pickModels, selectMockModels } from './runHelpers';

const STORE_KEY = 'ensemble-ai-store';

function savedPreset(page: Page, name: string) {
  return page.getByTestId('history-preset').filter({ hasText: name });
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
  await page.getByTestId('composer-options-trigger').click();
  await page.getByTestId('composer-option-preset').click();
  const dialog = page.getByTestId('save-preset-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('preset-name-input').fill(name);
  await dialog.getByTestId('preset-save-button').click();
  await expect(dialog).toBeHidden();
  await expect(savedPreset(page, name)).toBeVisible();
}

async function removeAllModels(page: Page) {
  const chips = page.getByTestId('model-chip-remove');
  while ((await chips.count()) > 0) await chips.first().click();
}

test.describe('Saved ensembles', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'claude-haiku-5-5']);
    await page.getByTestId('method-menu-trigger').click();
    await page.getByTestId('method-menu-summarizer').selectOption('claude-haiku-5-5');
    await page.keyboard.press('Escape');
  });

  test('saving is offered only once models are chosen', async ({ page }) => {
    await removeAllModels(page);
    await page.getByTestId('composer-options-trigger').click();
    await expect(page.getByTestId('composer-option-preset')).toHaveCount(0);
    await expect(page.getByTestId('composer-option-manual')).toBeVisible();
  });

  test('saves the current ensemble and keeps it after a reload', async ({ page }) => {
    await saveCurrentEnsemble(page, 'Quick pair');

    await expect(savedPreset(page, 'Quick pair')).toContainText('2 models');
    await expect.poll(() => storedPresetNames(page)).toEqual(['Quick pair']);

    await page.reload();
    await expect(savedPreset(page, 'Quick pair')).toBeVisible();
  });

  test('loading a saved ensemble restores its models, method and summarizer', async ({ page }) => {
    await chooseMethod(page, 'majority');
    await saveCurrentEnsemble(page, 'Quick pair');

    await removeAllModels(page);
    await pickModels(page, ['gpt-6-luna', 'claude-sonnet-5-5']);
    await chooseMethod(page, 'standard');

    await savedPreset(page, 'Quick pair').getByRole('button', { name: /^Quick pair/ }).click();

    await expect(modelChip(page, 'gpt-6-astra')).toBeVisible();
    await expect(modelChip(page, 'claude-haiku-5-5')).toBeVisible();
    await expect(modelChip(page, 'gpt-6-luna')).toHaveCount(0);
    await expect(modelChip(page, 'claude-sonnet-5-5')).toHaveCount(0);
    await expect(page.getByTestId('method-menu-trigger')).toContainText('Majority');
    await page.getByTestId('method-menu-trigger').click();
    await expect(page.getByTestId('method-menu-summarizer')).toHaveValue('claude-haiku-5-5');
  });

  test('saving under an existing name replaces that ensemble', async ({ page }) => {
    await saveCurrentEnsemble(page, 'Quick pair');
    await pickModels(page, ['gpt-6-luna']);
    await saveCurrentEnsemble(page, 'Quick pair');

    await expect(page.getByTestId('history-preset')).toHaveCount(1);
    await expect(savedPreset(page, 'Quick pair')).toContainText('3 models');
    await expect.poll(() => storedPresetNames(page)).toEqual(['Quick pair']);
  });

  test('deletes a saved ensemble and it stays deleted after a reload', async ({ page }) => {
    await saveCurrentEnsemble(page, 'Keep me');
    await saveCurrentEnsemble(page, 'Delete me');

    await savedPreset(page, 'Delete me').getByRole('button', { name: /Delete preset Delete me/ }).click();

    await expect(savedPreset(page, 'Delete me')).toHaveCount(0);
    await expect(savedPreset(page, 'Keep me')).toBeVisible();
    await expect.poll(() => storedPresetNames(page)).toEqual(['Keep me']);

    await page.reload();
    await expect(savedPreset(page, 'Delete me')).toHaveCount(0);
    await expect(savedPreset(page, 'Keep me')).toBeVisible();
    // Deleting a preset leaves the current selection alone.
    await expect(modelChip(page, 'gpt-6-astra')).toBeVisible();
  });
});
