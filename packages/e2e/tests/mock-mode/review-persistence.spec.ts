/**
 * The last run survives a reload of /review (roadmap M1). A stream cut off
 * by the reload is shown as interrupted, and a new run replaces the old one.
 */
import { test, expect } from '@playwright/test';
import { responseCard, startMockRun } from './runHelpers';

test.describe('Review page persistence', () => {
  test.setTimeout(90_000);

  test('a completed run is still shown after a reload', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'Persisted question' });

    const consensus = page.getByTestId('consensus-card');
    await expect(consensus).toHaveAttribute('data-status', 'success', { timeout: 30_000 });
    const consensusText = await consensus.textContent();
    const answerText = await responseCard(page, 'gpt-6-astra').textContent();

    await page.reload();

    await expect(page).toHaveURL(/\/review/);
    await expect(page.getByText('Persisted question')).toBeVisible();
    await expect(responseCard(page, 'gpt-6-astra')).toHaveAttribute('data-status', 'complete');
    await expect(responseCard(page, 'gpt-6-luna')).toHaveAttribute('data-status', 'complete');
    expect(await responseCard(page, 'gpt-6-astra').textContent()).toBe(answerText);
    await expect(consensus).toHaveAttribute('data-status', 'success');
    expect(await consensus.textContent()).toBe(consensusText);
  });

  test('opening /review again shows the last run', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'Revisited question' });
    await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success', { timeout: 30_000 });

    await page.goto('/about');
    await page.goto('/review');

    await expect(page.getByText('Revisited question')).toBeVisible();
    await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success');
  });

  test('a stream cut off by a reload is shown as interrupted, not streaming', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'] });
    await expect(responseCard(page, 'gpt-6-astra')).toHaveAttribute('data-status', 'streaming', { timeout: 10_000 });

    await page.reload();

    const card = responseCard(page, 'gpt-6-astra');
    await expect(card).toHaveAttribute('data-error-kind', 'interrupted');
    await expect(card.getByTestId('response-error-title')).toHaveText('Answer interrupted');
    await expect(page.locator('[data-status="streaming"]')).toHaveCount(0);

    await card.getByTestId('retry-button').click();
    await expect(card).toHaveAttribute('data-status', 'complete', { timeout: 30_000 });
  });

  test('a new run replaces the previous results', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'First question' });
    await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success', { timeout: 30_000 });

    await page.getByRole('button', { name: /back to prompt/i }).click();
    await expect(page).toHaveURL(/\/prompt/);
    await page.getByTestId('prompt-textarea').fill('Second question');
    await page.getByRole('button', { name: /generate responses/i }).click();
    await expect(page).toHaveURL(/\/review/);

    await expect(page.getByText('Second question')).toBeVisible();
    await expect(page.getByText('First question')).toHaveCount(0);
    await expect(page.locator('[data-testid^="response-card-"]')).toHaveCount(2);
    await expect(page.getByTestId('consensus-card')).not.toHaveAttribute('data-status', 'success');
    await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success', { timeout: 30_000 });
  });

  test('after New comparison, /review does not run the unsubmitted draft', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'Submitted question' });
    await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success', { timeout: 30_000 });

    await page.getByRole('button', { name: /new comparison/i }).click();
    await expect(page).toHaveURL(/\/prompt/);
    await page.getByTestId('prompt-textarea').fill('Draft never submitted ');

    await page.goto('/review');

    await expect(page).toHaveURL(/\/prompt/);
    await expect(page.locator('[data-testid^="response-card-"]')).toHaveCount(0);
    await expect(page.getByTestId('prompt-textarea')).toHaveValue('Draft never submitted ');
  });
});
