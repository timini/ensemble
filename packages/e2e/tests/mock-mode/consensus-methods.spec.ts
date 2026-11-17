/**
 * Consensus methods in the composer's method menu (mock mode): which
 * methods can run with the chosen models, the calls each costs, a standard
 * consensus and the majority vote breakdown.
 */
import { test, expect } from '@playwright/test';
import { ask, chooseMethod, consensus, selectMockModels, startMockRun, waitForConsensus } from './runHelpers';

test.describe('Consensus methods', () => {
  test.setTimeout(90_000);

  test('Ranked and Council need 3 answers; Standard writes a consensus', async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna'], undefined, ['openai', 'anthropic']);

    await page.getByTestId('method-menu-trigger').click();
    await expect(page.getByTestId('method-option-elo')).toBeDisabled();
    await expect(page.getByTestId('method-option-council')).toBeDisabled();
    await expect(page.getByTestId('method-option-elo')).toContainText('Needs at least 3 answers');
    await expect(page.getByTestId('method-option-standard')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('method-option-majority')).toBeEnabled();
    await page.keyboard.press('Escape');

    await ask(page, 'Test prompt for consensus');
    await waitForConsensus(page);
    expect((await consensus(page).textContent())?.length).toBeGreaterThan(20);
    await expect(page.getByTestId('consensus-answer-by')).toContainText('Standard');
  });

  test('Ranked becomes available with a third model', async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna', 'claude-haiku-5-5']);
    await chooseMethod(page, 'elo');
    await expect(page.getByTestId('method-menu-trigger')).toContainText('Ranked');
  });

  test('shows the majority vote breakdown with a winner', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], method: 'majority' });

    const breakdown = page.getByTestId('majority-vote-breakdown');
    await expect(breakdown).toBeVisible({ timeout: 30_000 });
    await expect(breakdown).toHaveAttribute('data-outcome', 'winner');
    await expect(page.getByTestId('majority-vote-summary')).toHaveText('42 won with 2 of 2 votes.');
    await expect(page.getByTestId('consensus-answer-by')).toContainText('Majority');
  });
});
