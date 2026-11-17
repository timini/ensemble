/**
 * The old four-step wizard routes redirect into the workspace with the
 * matching part open, so links and bookmarks keep working.
 */
import { test, expect } from '@playwright/test';
import { configureKeys, startMockRun, waitForConsensus } from './runHelpers';

test.describe('Old wizard routes', () => {
  test('/config opens the settings sheet', async ({ page }) => {
    await page.goto('/config');
    await expect(page).toHaveURL(/\/workspace\?panel=settings$/);
    await expect(page.getByTestId('settings-sheet')).toBeVisible();
  });

  test('closing settings opened from /config leaves a plain workspace URL', async ({ page }) => {
    await page.goto('/config');
    await page.getByTestId('settings-sheet-close').click();
    await expect(page).toHaveURL(/\/workspace$/);
  });

  test('/ensemble opens the model picker', async ({ page }) => {
    await configureKeys(page, ['openai']);
    await page.goto('/ensemble');
    await expect(page).toHaveURL(/\/workspace\?panel=models$/);
    await expect(page.getByTestId('model-picker-panel')).toBeVisible();
  });

  test('/prompt focuses the question', async ({ page }) => {
    await page.goto('/prompt');
    await expect(page).toHaveURL(/\/workspace\?panel=prompt$/);
    await expect(page.getByTestId('composer-prompt')).toBeFocused();
  });

  test('/review shows the last run', async ({ page }) => {
    test.setTimeout(60_000);
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'Revisited question' });
    await waitForConsensus(page);
    await page.goto('/about');
    await page.goto('/review');
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByTestId('composer-prompt')).toHaveValue('Revisited question');
    await expect(page.getByTestId('consensus-answer')).toHaveAttribute('data-status', 'success');
  });

  test('keeps other query parameters, such as mock error scenarios', async ({ page }) => {
    await page.goto('/config?mockErrors=gpt-6-luna:401');
    await expect(page).toHaveURL(/\/workspace\?mockErrors=gpt-6-luna%3A401&panel=settings$/);
  });
});
