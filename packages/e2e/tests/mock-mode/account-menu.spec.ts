/**
 * The account menu in the workspace header. The mock server has no
 * NEXT_PUBLIC_FIREBASE_* config, so sign-in is unavailable and the menu
 * says Free mode needs no account. Sign-in itself is covered by the
 * pro-mode suite against the Auth emulator.
 */
import { test, expect } from '@playwright/test';

test.describe('Account menu without sign-in configured', () => {
  test('explains that Free mode works without an account', async ({ page }) => {
    await page.goto('/workspace');
    const trigger = page.getByTestId('account-menu-trigger');
    await expect(trigger).toHaveText('Sign in');
    await expect(trigger).toHaveAttribute('data-status', 'unavailable');
    await trigger.click();
    await expect(page.getByTestId('account-menu-unavailable')).toContainText(
      'Free mode works without an account',
    );
    await expect(page.getByTestId('sign-in-panel')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('account-menu-panel')).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
