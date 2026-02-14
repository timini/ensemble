import { test, expect } from '@playwright/test';

test.describe('Features Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/features');
  });

  test('loads features page successfully', async ({ page }) => {
    await expect(page).toHaveURL('/features');
    await expect(page.getByTestId('features-page')).toBeVisible();
  });

  test('displays page hero with title and description', async ({ page }) => {
    const hero = page.getByTestId('page-hero');
    await expect(hero).toBeVisible();
    await expect(hero.getByRole('heading')).toBeVisible();
  });

  test('displays How It Works section with 4 steps', async ({ page }) => {
    const section = page.getByTestId('features-how-it-works-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();

    // Verify 4 workflow steps are rendered
    const listItems = section.getByRole('listitem');
    await expect(listItems).toHaveCount(4);
  });

  test('displays Operating Modes section with Free and Pro', async ({ page }) => {
    const section = page.getByTestId('features-modes-section');
    await expect(section).toBeVisible();

    // Verify both mode headings
    const headings = section.getByRole('heading', { level: 3 });
    await expect(headings).toHaveCount(2);
  });

  test('displays Supported Providers section with 4 providers', async ({ page }) => {
    const section = page.getByTestId('features-providers-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();

    // Verify 4 provider cards
    const providerHeadings = section.getByRole('heading', { level: 3 });
    await expect(providerHeadings).toHaveCount(4);
  });

  test('displays Security & Privacy section with feature list', async ({ page }) => {
    const section = page.getByTestId('features-security-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();

    // Verify security features are listed (at least 3)
    const listItems = section.getByRole('listitem');
    const count = await listItems.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('header Features link navigates to features page', async ({ page }) => {
    await page.goto('/config');
    await page.getByRole('link', { name: /features/i }).click();
    await expect(page).toHaveURL('/features');
    await expect(page.getByTestId('features-page')).toBeVisible();
  });
});
