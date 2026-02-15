import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('loads about page successfully', async ({ page }) => {
    await expect(page).toHaveURL('/about');
    await expect(page.getByTestId('about-page')).toBeVisible();
  });

  test('displays page hero with title and description', async ({ page }) => {
    await expect(page.getByTestId('page-hero')).toBeVisible();
    await expect(page.getByText(/about ensemble ai/i)).toBeVisible();
  });

  test('displays What is Ensemble AI section', async ({ page }) => {
    const section = page.getByTestId('about-what-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();
  });

  test('displays Why an Ensemble section', async ({ page }) => {
    const section = page.getByTestId('about-why-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();
  });

  test('displays The Research section with papers', async ({ page }) => {
    const section = page.getByTestId('about-research-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toBeVisible();

    // Verify research papers are rendered (expect at least 3 links)
    const paperLinks = section.getByRole('link');
    await expect(paperLinks).toHaveCount(5);
  });

  test('research paper links open in new tab', async ({ page }) => {
    const section = page.getByTestId('about-research-section');
    const firstLink = section.getByRole('link').first();
    await expect(firstLink).toHaveAttribute('target', '_blank');
    await expect(firstLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('displays bottom CTA with config link and features link', async ({ page }) => {
    const cta = page.getByTestId('about-bottom-cta');
    await expect(cta).toBeVisible();

    // Primary CTA links to /config
    const configLink = cta.getByRole('link', { name: /see it in action/i });
    await expect(configLink).toHaveAttribute('href', '/config');

    // Secondary link to /features
    const featuresLink = page.getByTestId('features-cta-link');
    await expect(featuresLink).toHaveAttribute('href', '/features');
  });

  test('header About link navigates to about page', async ({ page }) => {
    await page.goto('/config');
    await page.getByRole('link', { name: /about/i }).click();
    await expect(page).toHaveURL('/about');
    await expect(page.getByTestId('about-page')).toBeVisible();
  });
});
