/**
 * Language Persistence E2E Test (T177)
 *
 * The language (EN or FR), chosen in the workspace's settings sheet,
 * persists across reloads, navigation and browser sessions (localStorage),
 * and the UI text changes with it.
 */
import { test, expect, type Page } from '@playwright/test';
import { ask, closeSettings, openSettings, selectMockModels } from './runHelpers';

async function chooseLanguage(page: Page, language: 'en' | 'fr') {
  const sheet = await openSettings(page);
  await sheet.getByTestId(`language-${language}`).click();
  await expect(sheet.getByTestId(`language-${language}`)).toHaveAttribute('aria-checked', 'true');
  await closeSettings(page);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

test.describe('Language Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
  });

  test('default language is English', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ask several models at once.');
  });

  test('can switch to French in settings', async ({ page }) => {
    await chooseLanguage(page, 'fr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Interrogez plusieurs modèles à la fois.');
    await expect(page.getByTestId('composer-submit')).toHaveAccessibleName('Demander');
  });

  test('French persists across a reload', async ({ page }) => {
    await chooseLanguage(page, 'fr');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('French persists across navigation and on every page', async ({ page }) => {
    test.setTimeout(60_000);
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna']);
    await chooseLanguage(page, 'fr');
    await ask(page, 'Test en français');
    await expect(page.getByTestId('answer-columns')).toContainText('Réponses individuelles');

    for (const path of ['/features', '/about', '/benchmarks', '/config']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    }
  });

  test('can switch back to English', async ({ page }) => {
    await chooseLanguage(page, 'fr');
    await chooseLanguage(page, 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ask several models at once.');
  });

  test('language persists in localStorage', async ({ page, context }) => {
    await chooseLanguage(page, 'fr');

    const stored = await page.evaluate(() => window.localStorage.getItem('ensemble-ai-store'));
    expect(stored).toContain('"language":"fr"');

    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/workspace');
    await expect(newPage.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('UI text updates when language changes', async ({ page }) => {
    const english = await page.getByRole('heading', { level: 1 }).textContent();
    await chooseLanguage(page, 'fr');
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(english ?? '');
  });

  test('only EN and FR are offered, each named in its own language', async ({ page }) => {
    const sheet = await openSettings(page);
    const group = sheet.getByRole('radiogroup', { name: /language|langue/i });
    await expect(group.getByRole('radio')).toHaveCount(2);
    await expect(group.getByRole('radio', { name: 'English' })).toBeVisible();
    await expect(group.getByRole('radio', { name: 'Français' })).toBeVisible();
  });
});
