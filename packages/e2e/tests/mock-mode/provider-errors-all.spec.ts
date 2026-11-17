/**
 * Error scenarios when every model fails (T226). The single-model cases
 * (401, 429, 503, timeout) are in provider-errors.spec.ts.
 *
 * Each card explains its own error, the workspace says why there is no
 * consensus, and no agreement score is shown, since there is nothing to
 * compare.
 */
import { test, expect } from '@playwright/test';
import { agreement, answerCard, consensus, startMockRun, waitForConsensus } from './runHelpers';

const errorKind = (page: import('@playwright/test').Page, model: string) =>
  answerCard(page, model).getByTestId('response-error');

test.describe('Provider errors on every model', () => {
  test.setTimeout(90_000);

  test('mixed errors on all models: no consensus and no agreement score', async ({ page }) => {
    await startMockRun(page, {
      models: ['gpt-6-astra', 'gpt-6-luna', 'claude-haiku-5-5'],
      mockErrors: 'gpt-6-astra:401,gpt-6-luna:429,claude-haiku-5-5:timeout',
    });

    await expect(errorKind(page, 'gpt-6-astra')).toHaveAttribute('data-error-kind', 'invalid_key', { timeout: 15_000 });
    await expect(errorKind(page, 'gpt-6-luna')).toHaveAttribute('data-error-kind', 'rate_limited', { timeout: 15_000 });
    await expect(errorKind(page, 'claude-haiku-5-5')).toHaveAttribute('data-error-kind', 'timeout', {
      timeout: 15_000,
    });

    await expect(page.getByTestId('consensus-insufficient')).toContainText('0 of 3');
    await expect(consensus(page)).toHaveAttribute('data-status', 'unavailable');
    await expect(agreement(page)).toHaveAttribute('data-status', 'unavailable');
    await expect(page.getByTestId('agreement-pair')).toHaveCount(0);
    await expect(page.getByTestId('retry-button')).toHaveCount(3);
  });

  test('a 503 on every model, then a retry that succeeds, gives a consensus', async ({ page }) => {
    await startMockRun(page, {
      models: ['gpt-6-astra', 'gpt-6-luna'],
      mockErrors: 'gpt-6-astra:503:once,gpt-6-luna:503:once',
    });

    const astra = answerCard(page, 'gpt-6-astra');
    const luna = answerCard(page, 'gpt-6-luna');
    await expect(errorKind(page, 'gpt-6-astra')).toHaveAttribute('data-error-kind', 'provider_unavailable', {
      timeout: 15_000,
    });
    await expect(errorKind(page, 'gpt-6-luna')).toHaveAttribute('data-error-kind', 'provider_unavailable', {
      timeout: 15_000,
    });
    await expect(consensus(page)).toHaveAttribute('data-status', 'unavailable');

    await astra.getByTestId('retry-button').click();
    await expect(astra).toHaveAttribute('data-status', 'complete', { timeout: 30_000 });
    await luna.getByTestId('retry-button').click();
    await expect(luna).toHaveAttribute('data-status', 'complete', { timeout: 30_000 });

    await waitForConsensus(page);
    await expect(agreement(page)).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
  });
});
