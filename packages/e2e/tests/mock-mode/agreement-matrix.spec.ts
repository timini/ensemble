/**
 * Agreement analysis for 2 to 6 answers (T180).
 *
 * Every pair of answers gets one row, so n answers give n(n-1)/2 rows. The
 * stats show the number of answers and comparisons, and every model in the
 * run appears in the comparisons.
 */
import { test, expect } from '@playwright/test';
import { startMockRun } from './runHelpers';

const MODELS = [
  { id: 'gpt-6-astra', name: 'GPT-6 Astra' },
  { id: 'gpt-6-luna', name: 'GPT-6 Luna' },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5' },
  { id: 'gemini-4-hydrogen', name: 'Gemini 4 Hydrogen' },
  { id: 'grok-4.7', name: 'Grok 4.7' },
];

test.describe('Agreement analysis for 2 to 6 answers', () => {
  test.setTimeout(120_000);

  for (const count of [2, 3, 4, 5, 6]) {
    const pairs = (count * (count - 1)) / 2;

    test(`${count} answers give ${pairs} pairwise comparisons`, async ({ page }) => {
      const models = MODELS.slice(0, count);
      await startMockRun(page, { models: models.map((m) => m.id) });

      const analysis = page.getByTestId('agreement-analysis');
      await expect(analysis).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId('agreement-response-count')).toHaveText(String(count));
      await expect(page.getByTestId('agreement-comparison-count')).toHaveText(String(pairs));

      const rows = analysis.getByTestId('pairwise-comparison');
      await expect(rows).toHaveCount(pairs);
      for (const row of await rows.all()) {
        await expect(row.getByTestId('pairwise-similarity')).toHaveText(/^\d{1,3}%$/);
      }

      const comparisons = analysis.getByTestId('pairwise-comparisons');
      for (const model of models) {
        await expect(comparisons).toContainText(model.name);
      }
      await expect(page.getByTestId('agreement-overall')).toHaveText(/^\d{1,3}%$/);
    });
  }
});
