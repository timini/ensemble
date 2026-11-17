/**
 * Per-model error handling (roadmap M1).
 *
 * One failed model must not fail the run: its card explains the error and
 * offers a retry for that model only, and consensus and agreement run over
 * the answers that succeeded.
 */
import { test, expect } from '@playwright/test';
import { agreement, answerCard, consensus, startMockRun, waitForConsensus } from './runHelpers';

test.describe('Provider errors per model', () => {
  test.setTimeout(90_000);

  test('a 401 fails one card while consensus runs over the other answers', async ({ page }) => {
    await startMockRun(page, {
      models: ['gpt-6-astra', 'gpt-6-luna', 'claude-sonnet-5-5'],
      mockErrors: 'gpt-6-luna:401',
    });

    const failed = answerCard(page, 'gpt-6-luna');
    await expect(failed.getByTestId('response-error')).toHaveAttribute('data-error-kind', 'invalid_key', {
      timeout: 15_000,
    });
    await expect(failed.getByTestId('response-error-title')).toHaveText('API key rejected');
    await expect(failed.getByTestId('retry-button')).toBeVisible();

    await expect(answerCard(page, 'gpt-6-astra')).toHaveAttribute('data-status', 'complete', { timeout: 30_000 });
    await expect(answerCard(page, 'claude-sonnet-5-5')).toHaveAttribute('data-status', 'complete', {
      timeout: 30_000,
    });

    const note = page.getByTestId('run-exclusion-note');
    await expect(note).toContainText('GPT-6 Luna');
    await expect(note).toContainText('2 of 3');
    await waitForConsensus(page);
    await expect(agreement(page)).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
    await expect(page.getByTestId('agreement-pair')).toHaveCount(1);

    // The cost counts only the calls that ran: 2 answers, 1 consensus call
    // and 2 embedding calls.
    await expect(consensus(page).getByTestId('run-cost-calls')).toHaveText('5 model calls', { timeout: 30_000 });
    await expect(consensus(page).getByTestId('run-cost-amount')).toContainText('$');
  });

  test('retrying a failed model reruns only that model', async ({ page }) => {
    await startMockRun(page, {
      models: ['gpt-6-astra', 'gpt-6-luna', 'claude-sonnet-5-5'],
      mockErrors: 'gpt-6-luna:401:once',
    });

    const failed = answerCard(page, 'gpt-6-luna');
    await expect(failed).toHaveAttribute('data-status', 'error', { timeout: 15_000 });
    await waitForConsensus(page);
    const astraText = await answerCard(page, 'gpt-6-astra').textContent();

    await failed.getByTestId('retry-button').click();

    await expect(failed).toHaveAttribute('data-status', 'complete', { timeout: 30_000 });
    await expect(page.getByTestId('run-exclusion-note')).toHaveCount(0);
    await waitForConsensus(page);
    // The other answers were not requested again.
    expect(await answerCard(page, 'gpt-6-astra').textContent()).toBe(astraText);
  });

  test('a 429 shows the rate limit and when to retry', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], mockErrors: 'gpt-6-luna:429' });

    const failed = answerCard(page, 'gpt-6-luna');
    await expect(failed.getByTestId('response-error')).toHaveAttribute('data-error-kind', 'rate_limited', {
      timeout: 15_000,
    });
    await expect(failed.getByTestId('response-error-description')).toContainText('30 seconds');
    await expect(failed.getByTestId('retry-button')).toBeVisible();
  });

  test('a 503 shows the provider as unavailable and explains why there is no consensus', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], mockErrors: 'gpt-6-luna:503' });

    await expect(answerCard(page, 'gpt-6-luna').getByTestId('response-error')).toHaveAttribute(
      'data-error-kind',
      'provider_unavailable',
      { timeout: 15_000 },
    );
    await expect(answerCard(page, 'gpt-6-astra')).toHaveAttribute('data-status', 'complete', { timeout: 30_000 });

    const insufficient = page.getByTestId('consensus-insufficient');
    await expect(insufficient).toContainText('at least 2 answers');
    await expect(insufficient).toContainText('1 of 2');
    await expect(consensus(page)).toHaveAttribute('data-status', 'unavailable');
    await expect(page.getByTestId('agreement-unavailable')).toHaveAttribute('data-reason', 'tooFewAnswers');
  });

  test('a timeout shows the model ran out of time', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], mockErrors: 'gpt-6-luna:timeout' });

    const failed = answerCard(page, 'gpt-6-luna');
    await expect(failed.getByTestId('response-error')).toHaveAttribute('data-error-kind', 'timeout', {
      timeout: 15_000,
    });
    await expect(failed.getByTestId('response-error-title')).toHaveText('No answer in time');
    await expect(failed.getByTestId('retry-button')).toBeVisible();
  });
});
