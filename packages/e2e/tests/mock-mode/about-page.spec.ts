/**
 * /about: why Ensemble exists, what the agreement score can and cannot say,
 * who it is for, and published research framed by the claims rule, with a
 * link to the benchmarks.
 */
import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('says why Ensemble exists', async ({ page }) => {
    await expect(page.getByTestId('about-page')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Why Ensemble exists');
    await expect(page.getByTestId('about-problem')).toContainText('A single model gives no warning');
    await expect(page).toHaveTitle('About | Ensemble AI');
  });

  test('is honest about what the score can tell you', async ({ page }) => {
    await expect(page.getByTestId('about-score')).toContainText('Models can agree and still be wrong');
    await expect(page.getByTestId('about-page')).not.toContainText(/more accurate|better answers|consistently outperform/i);
  });

  test('names who it is for', async ({ page }) => {
    await expect(page.getByTestId('about-audience').getByTestId('about-audience-item')).toHaveCount(3);
  });

  test('lists research papers that open in a new tab, framed as not reproduced', async ({ page }) => {
    const section = page.getByTestId('about-research-section');
    await expect(section).toContainText('We have not reproduced them');
    const papers = section.getByTestId('about-paper');
    await expect(papers).toHaveCount(5);
    await expect(papers.first()).toHaveAttribute('target', '_blank');
    await expect(papers.first()).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('links to the benchmarks and the workspace', async ({ page }) => {
    await expect(page.getByTestId('about-workspace-link')).toHaveAttribute('href', '/workspace');
    await page.getByTestId('about-benchmarks-link').click();
    await expect(page).toHaveURL(/\/benchmarks$/);
  });

  test('header About link navigates to about page', async ({ page }) => {
    await page.goto('/features');
    await page.getByRole('navigation', { name: /main/i }).getByRole('link', { name: /about/i }).click();
    await expect(page).toHaveURL('/about');
    await expect(page.getByTestId('about-page')).toBeVisible();
  });
});
