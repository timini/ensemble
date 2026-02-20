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

  test('displays Differentiators section with 3 cards', async ({ page }) => {
    const section = page.getByTestId('features-differentiators-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();

    // Verify 3 differentiator cards with h3 headings
    const cardHeadings = section.getByRole('heading', { level: 3 });
    await expect(cardHeadings).toHaveCount(3);
  });

  test('displays Capabilities section with 4 stats', async ({ page }) => {
    const section = page.getByTestId('features-capabilities-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();

    // Verify 4 capability items with h3 headings
    const statHeadings = section.getByRole('heading', { level: 3 });
    await expect(statHeadings).toHaveCount(4);
  });

  test('displays How It Works section with 4 steps', async ({ page }) => {
    const section = page.getByTestId('features-how-it-works-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();

    // Verify 4 workflow step headings
    const stepHeadings = section.getByRole('heading', { level: 3 });
    await expect(stepHeadings).toHaveCount(4);
  });

  test('displays Operating Modes section with Free and Pro', async ({ page }) => {
    const section = page.getByTestId('features-modes-section');
    await expect(section).toBeVisible();

    // Verify both mode headings
    const headings = section.getByRole('heading', { level: 3 });
    await expect(headings).toHaveCount(2);

    // Verify feature checklists exist
    const listItems = section.getByRole('listitem');
    const count = await listItems.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('displays Model Ecosystem section with 6 providers', async ({ page }) => {
    const section = page.getByTestId('features-models-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();

    // Verify 6 provider cards
    const providerHeadings = section.getByRole('heading', { level: 3 });
    await expect(providerHeadings).toHaveCount(6);
  });

  test('displays Security & Privacy section with feature list', async ({ page }) => {
    const section = page.getByTestId('features-security-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();

    // Verify security features are listed (at least 6)
    const listItems = section.getByRole('listitem');
    const count = await listItems.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('displays hero CTA linking to config', async ({ page }) => {
    const cta = page.getByTestId('features-hero-cta');
    await expect(cta).toBeVisible();
    const link = cta.getByRole('link');
    await expect(link).toHaveAttribute('href', '/config');
  });

  test('displays workflow CTA linking to config', async ({ page }) => {
    const cta = page.getByTestId('features-workflow-cta');
    await expect(cta).toBeVisible();
    const link = cta.getByRole('link');
    await expect(link).toHaveAttribute('href', '/config');
  });

  test('displays bottom CTA with config link and about link', async ({ page }) => {
    const cta = page.getByTestId('features-bottom-cta');
    await expect(cta).toBeVisible();

    // Primary CTA links to /config
    const configLink = cta.getByRole('link', { name: /get started/i });
    await expect(configLink).toHaveAttribute('href', '/config');

    // Secondary link to /about
    const aboutLink = page.getByTestId('about-cta-link');
    await expect(aboutLink).toHaveAttribute('href', '/about');
  });

  test('header Features link navigates to features page', async ({ page }) => {
    await page.goto('/config');
    await page.getByRole('navigation', { name: /main/i }).getByRole('link', { name: /features/i }).click();
    await expect(page).toHaveURL('/features');
    await expect(page.getByTestId('features-page')).toBeVisible();
  });
});
