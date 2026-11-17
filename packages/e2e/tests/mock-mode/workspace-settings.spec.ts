/**
 * The settings sheet, which replaces the old /config page: keys and how
 * they are kept, the key count, the embeddings provider for the agreement
 * score, and clearing the data in this browser. Theme and language are in
 * theme-persistence and language-persistence; endpoints in
 * openai-compatible-mock.
 */
import { test, expect } from '@playwright/test';
import { keysConfigured, openSettings, resetStorage } from './runHelpers';

test.describe('Settings sheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
    await resetStorage(page);
  });

  test('opens from the header with keys, endpoints, embeddings, appearance and data', async ({ page }) => {
    const sheet = await openSettings(page);
    await expect(sheet.getByRole('heading', { name: 'Settings' })).toBeVisible();
    for (const section of ['keys', 'endpoints', 'embeddings', 'appearance', 'data']) {
      await expect(sheet.getByTestId(`settings-${section}`)).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });

  test('says how keys are kept', async ({ page }) => {
    const sheet = await openSettings(page);
    await expect(sheet.getByTestId('settings-security-note')).toHaveText(
      "Keys are encrypted in this browser and sent only to each provider, never to Ensemble's server.",
    );
  });

  test('counts the keys that work', async ({ page }) => {
    const sheet = await openSettings(page);
    await expect(sheet.getByText(/configure an api key to continue/i)).toBeVisible();
    await sheet.locator('[data-provider="openai"] input').fill('sk-test-openai-key');
    await expect(sheet.getByText(keysConfigured(1))).toBeVisible();
    await expect(sheet.getByText(/configure more or continue selecting models/i)).toBeVisible();
    await sheet.locator('[data-provider="anthropic"] input').fill('sk-ant-test-anthropic-key');
    await expect(sheet.getByText(keysConfigured(2))).toBeVisible();
  });

  test('keeps keys after a reload', async ({ page }) => {
    let sheet = await openSettings(page);
    await sheet.locator('[data-provider="openai"] input').fill('sk-test-openai-key');
    await expect(sheet.getByText(keysConfigured(1))).toBeVisible();
    // The key is stored encrypted, never in plain text.
    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ensemble-ai-store') ?? '{}').apiKeys?.openai))
      .toMatchObject({ key: '', encrypted: expect.any(String), status: 'valid' });
    await page.reload();
    await expect(page.getByTestId('workspace-setup')).toHaveCount(0);
    sheet = await openSettings(page);
    await expect(sheet.getByText(keysConfigured(1))).toBeVisible();
  });

  test('offers no Pro or Mock mode: Pro comes with sign-in (M5), Mock is never shown', async ({ page }) => {
    const sheet = await openSettings(page);
    await expect(page.locator('[data-mode]')).toHaveCount(0);
    await expect(sheet).not.toContainText(/mock/i);
  });

  test('shows the embeddings provider setting and keeps the choice', async ({ page }) => {
    const sheet = await openSettings(page);
    await expect(sheet.getByTestId('embeddings-provider-selector')).toBeVisible();
    await expect(sheet.getByTestId('embeddings-provider-option-auto')).toBeChecked();
    // No OpenAI or Google key yet: no provider.
    await expect(sheet.getByTestId('embeddings-provider-none')).toBeVisible();
    await expect(sheet.getByTestId('embeddings-provider-google-missing')).toBeVisible();

    await sheet.locator('[data-provider="openai"] input').fill('sk-test-openai-key');
    await sheet.locator('[data-provider="google"] input').fill('test-google-key');
    await expect(sheet.getByTestId('embeddings-provider-active')).toContainText('OpenAI');

    await sheet.getByTestId('embeddings-provider-option-google').check();
    await expect(sheet.getByTestId('embeddings-provider-active')).toContainText('Google');

    await page.reload();
    const again = await openSettings(page);
    await expect(again.getByTestId('embeddings-provider-option-google')).toBeChecked();
  });

  test('clears everything kept in this browser after a confirmation', async ({ page }) => {
    let sheet = await openSettings(page);
    await sheet.locator('[data-provider="openai"] input').fill('sk-test-openai-key');
    await expect(sheet.getByText(keysConfigured(1))).toBeVisible();

    await sheet.getByTestId('clear-data-button').click();
    await expect(sheet.getByTestId('clear-data-confirm')).toBeVisible();
    await sheet.getByTestId('clear-data-confirm-button').click();

    // Everything is gone, so the first-run onboarding comes back.
    await expect(page.getByTestId('onboarding-sheet')).toBeVisible();
    await page.getByTestId('onboarding-skip').click();
    await expect(page.getByTestId('workspace-setup')).toBeVisible();
    sheet = await openSettings(page);
    await expect(sheet.getByText(/configure an api key to continue/i)).toBeVisible();
  });
});
