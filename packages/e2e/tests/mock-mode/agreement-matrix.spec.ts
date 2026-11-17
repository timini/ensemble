/**
 * Agreement analysis for 2 to 6 answers (T180).
 *
 * Every pair of answers gets one row, so n answers give n(n-1)/2 rows, each
 * with a score from 0 to 1, and every model in the run appears in the pairs.
 * The overall score shows as a number from 0 to 100.
 */
import { test, expect } from '@playwright/test';
import { agreement, startMockRun } from './runHelpers';

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

      const summary = agreement(page);
      await expect(summary).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });

      const rows = summary.getByTestId('agreement-pair');
      await expect(rows).toHaveCount(pairs);
      for (const row of await rows.all()) {
        await expect(row).toHaveText(/(0|1)\.\d{2}$/);
      }
      for (const model of models) {
        await expect(rows.filter({ hasText: model.name }).first()).toBeAttached();
      }
      await expect(summary.getByTestId('agreement-ring-value')).toHaveText(/^\d{1,3}$/);
      await expect(summary.getByTestId('agreement-level')).toHaveAttribute('data-level', /high|medium|low/);
    });
  }
});
