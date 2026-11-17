/**
 * The last run survives a reload of the workspace (roadmap M1). A stream cut
 * off by the reload is shown as interrupted, and a new run replaces the old
 * one. Nothing is requested again on load.
 */
import { test, expect } from '@playwright/test';
import { answerCard, ask, consensus, startMockRun, waitForConsensus } from './runHelpers';

test.describe('Run persistence', () => {
  test.setTimeout(90_000);

  test('a completed run is still shown after a reload', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'Persisted question' });
    await waitForConsensus(page);
    const consensusText = await consensus(page).textContent();
    const answerText = await answerCard(page, 'gpt-6-astra').textContent();

    await page.reload();

    await expect(page.getByTestId('composer-prompt')).toHaveValue('Persisted question');
    await expect(page.getByTestId('history-item')).toContainText('Persisted question');
    await expect(answerCard(page, 'gpt-6-astra')).toHaveAttribute('data-status', 'complete');
    await expect(answerCard(page, 'gpt-6-luna')).toHaveAttribute('data-status', 'complete');
    expect(await answerCard(page, 'gpt-6-astra').textContent()).toBe(answerText);
    await expect(consensus(page)).toHaveAttribute('data-status', 'success');
    expect(await consensus(page).textContent()).toBe(consensusText);
  });

  test('a stream cut off by a reload is shown as interrupted, not streaming', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'] });
    await expect(answerCard(page, 'gpt-6-astra')).toHaveAttribute('data-status', 'streaming', { timeout: 10_000 });

    await page.reload();

    const card = answerCard(page, 'gpt-6-astra');
    await expect(card.getByTestId('response-error')).toHaveAttribute('data-error-kind', 'interrupted');
    await expect(card.getByTestId('response-error-title')).toHaveText('Answer interrupted');
    await expect(page.locator('[data-testid="answer-card"][data-status="streaming"]')).toHaveCount(0);

    await card.getByTestId('retry-button').click();
    await expect(card).toHaveAttribute('data-status', 'complete', { timeout: 30_000 });
  });

  test('a new run replaces the previous results', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'First question' });
    await waitForConsensus(page);

    await ask(page, 'Second question');

    await expect(page.getByTestId('history-item')).toHaveCount(1);
    await expect(page.getByTestId('history-item')).toContainText('Second question');
    await expect(page.getByTestId('answer-card')).toHaveCount(2);
    await expect(consensus(page)).not.toHaveAttribute('data-status', 'success');
    await waitForConsensus(page);
  });

  test('after New question, a reload runs nothing and keeps the draft', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'Submitted question' });
    await waitForConsensus(page);

    await page.getByTestId('history-new').click();
    await page.getByTestId('composer-prompt').fill('Draft never submitted ');

    await page.reload();

    await expect(page.getByTestId('run-result')).toHaveCount(0);
    await expect(page.getByTestId('answer-card')).toHaveCount(0);
    await expect(page.getByTestId('composer-prompt')).toHaveValue('Draft never submitted ');
  });
});
