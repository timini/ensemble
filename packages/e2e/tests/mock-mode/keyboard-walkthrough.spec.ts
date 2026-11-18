/**
 * Keyboard-only walkthrough of the whole flow (old task T182): from the
 * landing page through onboarding, picking models, asking, reading the
 * result, the history sidebar and settings, with no mouse. Each control is
 * reached with Tab and used with Enter, Space, arrows or Escape.
 */
import { test, expect, type Page } from '@playwright/test';
import { waitForConsensus } from './runHelpers';

test.use({ storageState: { cookies: [], origins: [] } });

/** Presses Tab (or Shift+Tab) until the element with this test id has focus. */
async function tabTo(page: Page, testId: string, { back = false, max = 80 } = {}) {
  for (let i = 0; i < max; i++) {
    const active = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);
    if (active === testId) return;
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  }
  throw new Error(`${testId} was not reached with ${back ? 'Shift+Tab' : 'Tab'}`);
}

/** Focus is shown: the focused element draws an outline or a ring. */
async function expectVisibleFocus(page: Page) {
  const shown = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return false;
    const style = getComputedStyle(el);
    return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
  });
  expect(shown).toBe(true);
}

test('the whole flow works with the keyboard alone', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');

  // Landing: the skip link comes first, then the way in with own keys.
  await page.keyboard.press('Tab');
  await expectVisibleFocus(page);
  await tabTo(page, 'ways-in-keys');
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');

  // Onboarding: type a key, then Start.
  await expect(page.getByTestId('onboarding-sheet')).toBeVisible();
  await tabTo(page, 'onboarding-key-input');
  await page.keyboard.type('sk-test-openai-key');
  await expect(page.getByTestId('onboarding-key-field')).toHaveAttribute('data-status', 'valid');
  await tabTo(page, 'onboarding-start');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('onboarding-sheet')).toBeHidden();
  await expect(page.getByTestId('composer-prompt')).toBeFocused();

  // Composer: pick two models with the arrows and Enter, close with Escape.
  await tabTo(page, 'model-picker-trigger');
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('model-picker-panel')).toBeVisible();
  await tabTo(page, 'model-picker-option');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('model-picker-panel')).toBeHidden();
  await expect(page.getByTestId('model-picker-trigger')).toBeFocused();
  await expect(page.getByTestId('model-chip')).toHaveCount(2);

  // Method menu opens and closes from the keyboard.
  await tabTo(page, 'method-menu-trigger');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('method-menu-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('method-menu-panel')).toBeHidden();

  // Ask with Ctrl+Enter from the question.
  await tabTo(page, 'composer-prompt', { back: true });
  await page.keyboard.type('What is 6 times 7?');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByTestId('run-result')).toBeVisible();
  await waitForConsensus(page);

  // The result: the consensus and each answer can be copied.
  await tabTo(page, 'consensus-answer-copy');
  await expectVisibleFocus(page);
  await tabTo(page, 'answer-card-copy');

  // History sidebar: search it, then New question clears the screen.
  await tabTo(page, 'history-search', { back: true });
  await page.keyboard.type('6 times');
  await expect(page.getByTestId('history-item')).toHaveCount(1);
  await tabTo(page, 'history-new', { back: true });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('run-result')).toHaveCount(0);

  // Settings open with Enter and close with Escape, focus goes back.
  await tabTo(page, 'app-shell-settings', { back: true });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('settings-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('settings-sheet')).toBeHidden();
  await expect(page.getByTestId('app-shell-settings')).toBeFocused();
});

test.describe('on a phone', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    storageState: {
      cookies: [],
      origins: [{ origin: 'http://localhost:3000', localStorage: [{ name: 'ensemble-ai-store', value: JSON.stringify({ onboardingDone: true }) }] }],
    },
  });

  test('the history sheet opens and closes from the keyboard', async ({ page }) => {
    await page.goto('/workspace');
    await tabTo(page, 'app-shell-history-toggle');
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('app-shell-history-sheet')).toBeVisible();
    await tabTo(page, 'history-new');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('app-shell-history-sheet')).toBeHidden();
    await expect(page.getByTestId('app-shell-history-toggle')).toBeFocused();
  });
});
