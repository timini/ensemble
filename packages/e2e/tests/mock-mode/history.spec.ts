/**
 * History sidebar (roadmap M4): finished runs are kept in IndexedDB in Free
 * mode. A run can be found by search, reopened read only (nothing is sent
 * again) and deleted. History survives a reload.
 */
import { test, expect, type Page } from '@playwright/test';
import { answerCard, ask, consensus, startMockRun, waitForConsensus } from './runHelpers';

function historyItem(page: Page, text: string) {
  return page.getByTestId('history-item').filter({ hasText: text });
}

async function twoRuns(page: Page) {
  await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'First question about tides' });
  await waitForConsensus(page);
  await expect(historyItem(page, 'First question about tides')).toHaveCount(1);
  await ask(page, 'Second question about volcanoes');
  await waitForConsensus(page);
  await expect(page.getByTestId('history-item')).toHaveCount(2);
}

test.describe('History sidebar', () => {
  test.setTimeout(120_000);

  test('reopens an earlier run read only, and a new question leaves it', async ({ page }) => {
    await twoRuns(page);
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));

    await historyItem(page, 'First question about tides').getByRole('button').first().click();

    await expect(page.getByTestId('history-run-notice')).toContainText('read only');
    await expect(page.getByTestId('composer-prompt')).toHaveValue('First question about tides');
    await expect(answerCard(page, 'gpt-6-astra')).toHaveAttribute('data-status', 'complete');
    await expect(consensus(page)).toHaveAttribute('data-status', 'success');
    await expect(page.getByTestId('retry-button')).toHaveCount(0);
    await page.getByTestId('composer-options-trigger').click();
    await expect(page.getByTestId('composer-option-manual')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(historyItem(page, 'First question about tides').locator('[aria-current="true"]')).toHaveCount(1);
    expect(requests.filter((u) => u.includes('/api/'))).toEqual([]);

    await page.getByTestId('history-run-new').click();
    await expect(page.getByTestId('run-result')).toHaveCount(0);
    await expect(page.getByTestId('history-item')).toHaveCount(2);
  });

  test('a question asked from a reopened run starts a new live run', async ({ page }) => {
    await twoRuns(page);
    await historyItem(page, 'First question about tides').getByRole('button').first().click();
    await expect(page.getByTestId('history-run-notice')).toBeVisible();

    await ask(page, 'Third question about glaciers');

    await expect(page.getByTestId('history-run-notice')).toHaveCount(0);
    await waitForConsensus(page);
    await expect(page.getByTestId('history-item')).toHaveCount(3);
  });

  test('searches runs by prompt and answer text', async ({ page }) => {
    await twoRuns(page);
    const search = page.getByTestId('history-sidebar').getByRole('searchbox');
    await search.fill('volcano');
    await expect(page.getByTestId('history-item')).toHaveCount(1);
    await expect(page.getByTestId('history-item')).toContainText('volcanoes');
    await search.fill('nothing like this');
    await expect(page.getByTestId('history-no-matches')).toBeVisible();
  });

  test('deletes a run, and history survives a reload', async ({ page }) => {
    await twoRuns(page);
    await page.getByRole('button', { name: 'Delete "First question about tides"' }).click();
    await expect(page.getByTestId('history-item')).toHaveCount(1);

    await page.reload();

    await expect(page.getByTestId('history-item')).toHaveCount(1);
    await expect(page.getByTestId('history-item')).toContainText('Second question about volcanoes');
  });

  test('deleting the run on screen clears the workspace', async ({ page }) => {
    await twoRuns(page);
    await page.getByRole('button', { name: 'Delete "Second question about volcanoes"' }).click();
    await expect(page.getByTestId('run-result')).toHaveCount(0);
    await expect(page.getByTestId('history-item')).toHaveCount(1);
  });
});
