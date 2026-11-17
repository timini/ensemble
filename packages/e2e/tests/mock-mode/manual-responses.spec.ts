/**
 * Manual responses (T179, FR-023) in the workspace.
 *
 * An answer added by hand (composer options menu) before a run joins the
 * next run; added during or after a run it joins that run. It is shown with
 * the AI answers and scored in the agreement analysis, and the consensus
 * runs again to cover it. New question drops them, since they were written
 * for the previous prompt.
 */
import { test, expect } from '@playwright/test';
import {
  addManualAnswer,
  agreement,
  ask,
  manualAnswerCards,
  selectMockModels,
  startMockRun,
  waitForConsensus,
} from './runHelpers';

test.describe('Manual responses', () => {
  test.setTimeout(90_000);

  test('a manual answer added before the run is reviewed and scored with the AI answers', async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna']);

    await addManualAnswer(page, 'Textbook', 'Six times seven is forty-two.');
    const chip = page.locator('[data-testid="model-chip"][data-kind="manual"]');
    await expect(chip).toContainText('Textbook');

    await ask(page, 'What is 6 times 7?');

    await expect(manualAnswerCards(page)).toContainText('Textbook');
    await expect(agreement(page)).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
    await expect(page.getByTestId('agreement-pair')).toHaveCount(3);
    await expect(page.getByTestId('agreement-summary')).toContainText('Textbook');
    await waitForConsensus(page);
  });

  // These two tests use the majority method: the mock vote gives the last of
  // three or more answers a dissenting "41", so the vote summary shows how
  // many answers the consensus actually saw.
  test('a manual answer added after the run updates agreement and consensus', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], method: 'majority' });

    const voteSummary = page.getByTestId('majority-vote-summary');
    await waitForConsensus(page);
    await expect(voteSummary).toHaveText('42 won with 2 of 2 votes.');
    await expect(page.getByTestId('agreement-pair')).toHaveCount(1, { timeout: 30_000 });

    await addManualAnswer(page, 'My notes', 'The answer is forty-two.');

    await expect(manualAnswerCards(page)).toContainText('My notes');
    await expect(page.getByTestId('agreement-pair')).toHaveCount(3, { timeout: 30_000 });
    await expect(page.getByTestId('agreement-summary')).toContainText('My notes');
    // The consensus runs again over the three answers.
    await expect(voteSummary).toHaveText('42 won with 2 of 3 votes.', { timeout: 30_000 });
    await waitForConsensus(page);
  });

  test('New question drops the manual answers of the previous prompt', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'] });
    await waitForConsensus(page);

    await addManualAnswer(page, 'My notes', 'The answer is forty-two.');
    await expect(manualAnswerCards(page)).toContainText('My notes');

    await page.getByTestId('history-new').click();
    await expect(page.locator('[data-testid="model-chip"][data-kind="manual"]')).toHaveCount(0);

    await ask(page, 'A different question');
    await expect(page.getByTestId('agreement-pair')).toHaveCount(1, { timeout: 30_000 });
    await expect(manualAnswerCards(page)).toHaveCount(0);
  });

  test('a manual answer added while models are streaming is kept', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], method: 'majority' });
    await expect(page.locator('[data-testid="answer-card"][data-status="streaming"]').first()).toBeVisible({
      timeout: 10_000,
    });

    await addManualAnswer(page, 'Early answer', 'Forty-two.');

    await expect(manualAnswerCards(page)).toContainText('Early answer');
    await expect(page.getByTestId('agreement-pair')).toHaveCount(3, { timeout: 30_000 });
    await waitForConsensus(page);
    // The consensus covers the manual answer as well as the two models.
    await expect(page.getByTestId('majority-vote-summary')).toHaveText('42 won with 2 of 3 votes.');
  });
});
