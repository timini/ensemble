/**
 * First-run onboarding in the workspace: one decision (own key, local models
 * or Pro), a key checked inline, one key enough to start, and Skip. Mock
 * mode: any key works except one containing "invalid", and Ollama detection
 * does not run (the local-endpoint suite covers a found Ollama).
 */
import { test, expect, type Page } from '@playwright/test';
import { openModelPicker } from './runHelpers';

// A first visit: nothing in browser storage.
test.use({ storageState: { cookies: [], origins: [] } });

const sheet = (page: Page) => page.getByTestId('onboarding-sheet');

test.describe('Onboarding', () => {
  test('opens on the first visit with own keys, local models and Pro (coming soon)', async ({ page }) => {
    await page.goto('/workspace');
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).getByRole('heading', { name: 'How do you want to run models?' })).toBeVisible();
    await expect(page.getByTestId('onboarding-path-keys')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('onboarding-path-local')).toBeVisible();
    await expect(page.getByTestId('onboarding-path-pro')).toContainText('Coming soon');
    await expect(page.getByTestId('onboarding-start')).toBeDisabled();
  });

  test('says when a key does not work, and keeps Start disabled', async ({ page }) => {
    await page.goto('/workspace');
    await page.getByTestId('onboarding-key-input').fill('sk-proj-invalid-key');
    await expect(page.getByTestId('onboarding-key-provider')).toHaveValue('openai');
    const field = page.getByTestId('onboarding-key-field');
    await expect(field).toHaveAttribute('data-status', 'invalid');
    await expect(page.getByTestId('onboarding-key-status')).toContainText('OpenAI did not accept this key');
    await expect(page.getByTestId('onboarding-start')).toBeDisabled();
  });

  test('one working key is enough: start asking with its models', async ({ page }) => {
    await page.goto('/workspace');
    await page.getByTestId('onboarding-key-input').fill('sk-ant-test-key');
    await expect(page.getByTestId('onboarding-key-provider')).toHaveValue('anthropic');
    await expect(page.getByTestId('onboarding-key-field')).toHaveAttribute('data-status', 'valid');
    await expect(page.getByTestId('onboarding-key-status')).toContainText('The Anthropic key works.');
    await page.getByTestId('onboarding-start').click();

    await expect(sheet(page)).toBeHidden();
    await expect(page.getByTestId('composer-prompt')).toBeFocused();
    await expect(page.getByTestId('workspace-setup')).toHaveCount(0);
    const picker = await openModelPicker(page);
    await expect(picker.locator('[data-testid="model-picker-option"][data-model-id^="claude"]').first()).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('composer')).toBeVisible();
    await expect(sheet(page)).toHaveCount(0);
  });

  test('an OpenRouter key connects OpenRouter as an endpoint', async ({ page }) => {
    await page.goto('/workspace');
    await page.getByTestId('onboarding-key-input').fill('sk-or-v1-test-key');
    await expect(page.getByTestId('onboarding-key-provider')).toHaveValue('openrouter');
    await expect(page.getByTestId('onboarding-key-field')).toHaveAttribute('data-status', 'valid');
    await page.getByTestId('onboarding-start').click();

    await page.getByTestId('app-shell-settings').click();
    await expect(page.getByTestId('endpoint-openrouter')).toHaveAttribute('data-status', 'valid');
  });

  test('the local path says what to do when no server is found, and opens settings', async ({ page }) => {
    await page.goto('/workspace?start=local');
    await expect(page.getByTestId('onboarding-path-local')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('onboarding-local-none')).toBeVisible();
    await page.getByTestId('onboarding-local-settings').click();
    await expect(sheet(page)).toBeHidden();
    await expect(page.getByTestId('settings-sheet')).toBeVisible();
    await expect(page.getByTestId('settings-endpoints')).toBeVisible();
  });

  test('can be skipped, leaves the setup card, and does not come back', async ({ page }) => {
    await page.goto('/workspace');
    await page.getByTestId('onboarding-skip').click();
    await expect(sheet(page)).toBeHidden();
    await expect(page.getByTestId('workspace-setup')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('composer')).toBeVisible();
    await expect(sheet(page)).toHaveCount(0);
  });

  test('stays out of the way when a link asks for settings', async ({ page }) => {
    await page.goto('/config');
    await expect(page.getByTestId('settings-sheet')).toBeVisible();
    await expect(sheet(page)).toHaveCount(0);
  });

  test('is translated into French', async ({ page }) => {
    // Before the app loads, so the app does not write its own state over it.
    await page.addInitScript(() => localStorage.setItem('ensemble-ai-store', JSON.stringify({ language: 'fr' })));
    await page.goto('/workspace');
    await expect(sheet(page).getByRole('heading', { name: 'Comment voulez-vous utiliser les modèles ?' })).toBeVisible();
  });
});
