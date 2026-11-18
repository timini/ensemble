/**
 * WCAG 2.1 AA on every screen (old tasks T173, T181, T182): every route,
 * and every sheet, dialog and menu the workspace opens, at 375, 768 and
 * 1440 px, in light and dark, checked with axe-core. Each screen must also
 * fit its width with no sideways scroll.
 */
import { test, expect } from '@playwright/test';
import { THEMES, VIEWPORTS, expectAccessible, expectNoHorizontalScroll, seedTheme } from './a11yHelpers';
import { configureKeys, openModelPicker, pickModels, ask, waitForConsensus } from './runHelpers';

const ROUTES = ['/', '/workspace', '/features', '/about', '/benchmarks', '/no-such-page'];

for (const theme of THEMES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${theme}, ${viewport.width} px`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });
      test.beforeEach(async ({ page }) => {
        await seedTheme(page, theme);
      });

      for (const route of ROUTES) {
        test(`page ${route}`, async ({ page }) => {
          await page.goto(route);
          await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
          await expectAccessible(page);
          await expectNoHorizontalScroll(page);
        });
      }

      test('workspace sheets, menus and a finished run', async ({ page }) => {
        test.setTimeout(120_000);
        await configureKeys(page, ['openai']);

        await page.getByTestId('app-shell-settings').click();
        await expect(page.getByTestId('settings-sheet')).toBeVisible();
        await expectAccessible(page);
        await page.getByTestId('settings-sheet-close').click();

        await openModelPicker(page);
        await expectAccessible(page);
        await page.keyboard.press('Escape');
        await pickModels(page, ['gpt-6-astra', 'gpt-6-luna']);

        await page.getByTestId('method-menu-trigger').click();
        await expect(page.getByTestId('method-menu-panel')).toBeVisible();
        await expectAccessible(page);
        await page.keyboard.press('Escape');

        await page.getByTestId('composer-options-trigger').click();
        await page.getByTestId('composer-option-manual').click();
        await expect(page.getByTestId('manual-response-modal')).toBeVisible();
        await expectAccessible(page);
        await page.keyboard.press('Escape');

        await page.getByTestId('composer-options-trigger').click();
        await page.getByTestId('composer-option-preset').click();
        await expect(page.getByTestId('save-preset-dialog')).toBeVisible();
        await expectAccessible(page);
        await page.keyboard.press('Escape');

        await ask(page, 'What is 6 times 7?');
        await waitForConsensus(page);
        await expectAccessible(page);
        await expectNoHorizontalScroll(page);

        if (viewport.width < 1024) {
          await page.getByTestId('app-shell-history-toggle').click();
          await expect(page.getByTestId('history-sidebar')).toBeVisible();
          await expectAccessible(page);
        }
      });

      test('onboarding sheet', async ({ page }) => {
        // Runs after seedTheme's script, so this first visit has no onboarding done.
        await page.addInitScript((t) => {
          localStorage.setItem('ensemble-ai-store', JSON.stringify({ theme: t }));
        }, theme);
        await page.goto('/workspace');
        await expect(page.getByTestId('onboarding-sheet')).toBeVisible();
        await expectAccessible(page);
      });
    });
  }
}
