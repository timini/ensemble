/**
 * Manual responses (T179, FR-023).
 *
 * A manual answer can be added on /prompt before the run and on /review
 * during or after it. It is shown with the AI answers and counted in the
 * agreement analysis. Adding one after the consensus is done makes the
 * consensus run again so it covers the new answer. New comparison drops
 * them, since they were written for the previous prompt.
 */
import { test, expect, type Page } from '@playwright/test';
import { selectMockModels, startMockRun } from './runHelpers';

async function addManualResponse(page: Page, label: string, text: string) {
  await page.getByTestId('add-manual-response').click();
  const modal = page.getByTestId('manual-response-modal');
  await expect(modal).toBeVisible();
  await modal.getByTestId('model-name-input').fill(label);
  await modal.getByTestId('model-provider-input').fill('Reference');
  await modal.getByTestId('response-textarea').fill(text);
  await modal.getByTestId('submit-button').click();
  await expect(modal).toBeHidden();
}

/** Runs two mock models with the majority consensus method. */
async function startMajorityRun(page: Page) {
  await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna']);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/\/prompt/);
  await page.getByTestId('preset-majority').click();
  await expect(page.getByTestId('preset-majority')).toBeChecked();
  await page.getByTestId('prompt-textarea').fill('What is 6 times 7?');
  await page.getByRole('button', { name: /generate responses/i }).click();
  await expect(page).toHaveURL(/\/review/);
}

test.describe('Manual responses', () => {
  test.setTimeout(90_000);

  test('a manual answer added on /prompt is reviewed and scored with the AI answers', async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna']);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/\/prompt/);

    await addManualResponse(page, 'Textbook', 'Six times seven is forty-two.');
    await expect(page.getByTestId('manual-responses-preview')).toContainText('Textbook');

    await page.getByTestId('prompt-textarea').fill('What is 6 times 7?');
    await page.getByRole('button', { name: /generate responses/i }).click();
    await expect(page).toHaveURL(/\/review/);

    await expect(page.locator('[data-response-type="manual"]')).toContainText('Textbook');
    await expect(page.getByTestId('agreement-response-count')).toHaveText('3', { timeout: 30_000 });
    await expect(page.getByTestId('agreement-comparison-count')).toHaveText('3');
    await expect(page.getByTestId('pairwise-comparisons')).toContainText('Textbook');
    await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success', { timeout: 30_000 });
  });

  // These two tests use the majority method: the mock vote gives the last of
  // three or more answers a dissenting "41", so the vote summary shows how
  // many answers the consensus actually saw.
  test('a manual answer added on /review after the run updates agreement and consensus', async ({ page }) => {
    await startMajorityRun(page);

    const consensus = page.getByTestId('consensus-card');
    const voteSummary = page.getByTestId('majority-vote-summary');
    await expect(consensus).toHaveAttribute('data-status', 'success', { timeout: 30_000 });
    await expect(voteSummary).toHaveText('42 won with 2 of 2 votes.');
    await expect(page.getByTestId('agreement-response-count')).toHaveText('2', { timeout: 30_000 });

    await addManualResponse(page, 'My notes', 'The answer is forty-two.');

    await expect(page.locator('[data-response-type="manual"]')).toContainText('My notes');
    await expect(page.getByTestId('agreement-response-count')).toHaveText('3', { timeout: 30_000 });
    await expect(page.getByTestId('agreement-comparison-count')).toHaveText('3');
    await expect(page.getByTestId('pairwise-comparisons')).toContainText('My notes');
    // The consensus runs again over the three answers.
    await expect(voteSummary).toHaveText('42 won with 2 of 3 votes.', { timeout: 30_000 });
    await expect(consensus).toHaveAttribute('data-status', 'success');
  });

  test('New comparison drops the manual answers of the previous prompt', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'] });
    await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success', { timeout: 30_000 });

    await addManualResponse(page, 'My notes', 'The answer is forty-two.');
    await expect(page.locator('[data-response-type="manual"]')).toContainText('My notes');

    await page.getByRole('button', { name: /new comparison/i }).click();
    await expect(page).toHaveURL(/\/prompt/);
    await expect(page.getByTestId('manual-responses-preview')).toHaveCount(0);

    await page.getByTestId('prompt-textarea').fill('A different question');
    await page.getByRole('button', { name: /generate responses/i }).click();
    await expect(page).toHaveURL(/\/review/);
    await expect(page.getByTestId('agreement-response-count')).toHaveText('2', { timeout: 30_000 });
    await expect(page.locator('[data-response-type="manual"]')).toHaveCount(0);
  });

  test('a manual answer added on /review while models are streaming is kept', async ({ page }) => {
    await startMajorityRun(page);
    await expect(page.locator('[data-status="streaming"]').first()).toBeVisible({ timeout: 10_000 });

    await addManualResponse(page, 'Early answer', 'Forty-two.');

    await expect(page.locator('[data-response-type="manual"]')).toContainText('Early answer');
    await expect(page.getByTestId('agreement-response-count')).toHaveText('3', { timeout: 30_000 });
    await expect(page.getByTestId('consensus-card')).toHaveAttribute('data-status', 'success', { timeout: 30_000 });
    // The consensus covers the manual answer as well as the two models.
    await expect(page.getByTestId('majority-vote-summary')).toHaveText('42 won with 2 of 3 votes.');
  });
});
