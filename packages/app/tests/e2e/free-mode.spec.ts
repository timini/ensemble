import { test, expect, type Page } from '@playwright/test';

const expectConfiguredApiKeys = async (page: Page, count: number) => {
    const label =
        count === 1
            ? /1 API key configured/i
            : new RegExp(`${count} API keys configured`, 'i');
    await expect(page.getByText(label)).toBeVisible();
};

test.describe('Free Mode Workflow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`[Browser] ${msg.text()}`));
        await page.goto('/config');
    });

    test('validates API keys correctly', async ({ page }) => {
        // Select Free mode
        await page.locator('[data-mode="free"]').click();

        // Initial state: 0 keys configured
        await expectConfiguredApiKeys(page, 0);
        const continueButton = page.getByRole('button', { name: /continue/i });
        await expect(continueButton).toBeDisabled();

        // Enter invalid key (mock client should accept anything non-empty, 
        // but we can test the UI interaction)
        // Note: Mock client validateApiKey always returns true currently.
        // To test invalid key, we'd need to mock the validation response or use a specific "invalid" key if supported.
        // For now, we verify the "validating" state and success.

        // Enter valid key
        await page.locator('[data-provider="openai"] input').fill('sk-test-key');

        // Should show "Validating..." then "API key configured"
        // (Fast in mock mode, so might skip validating check in E2E)
        await expect(page.getByText('API key configured').first()).toBeVisible();

        // Verify count updated
        await expectConfiguredApiKeys(page, 1);

        // Continue should be enabled
        await expect(continueButton).toBeEnabled();
    });

    test('requires at least one API key to continue', async ({ page }) => {
        await page.locator('[data-mode="free"]').click();

        const continueButton = page.getByRole('button', { name: /continue/i });
        await expect(continueButton).toBeDisabled();

        // Enter key
        await page.locator('[data-provider="anthropic"] input').fill('sk-ant-test');
        await expect(continueButton).toBeEnabled();

        // Clear key
        await page.locator('[data-provider="anthropic"] input').fill('');
        await expect(continueButton).toBeDisabled();
    });

    test('persists API keys in localStorage', async ({ page }) => {
        await page.locator('[data-mode="free"]').click();
        await page.locator('[data-provider="google"] input').fill('test-google-key');
        await expectConfiguredApiKeys(page, 1);

        // Reload page
        await page.reload();

        // Should still have key configured
        await expect(page.locator('[data-mode="free"]')).toHaveAttribute('data-selected', 'true');
        // Note: Input value might be masked or empty if not hydrated yet, 
        // but the validation status should eventually return to valid.
        // In the current implementation, we don't re-populate the input for security (unless we implement that).
        // But the store has it.

        // Wait for hydration and validation
        await expectConfiguredApiKeys(page, 1);
    });

    test('fetches and displays dynamic models from provider', async ({ page }) => {
        // Mock Google API response
        await page.route('https://generativelanguage.googleapis.com/v1beta/models*', async (route) => {
            const json = {
                models: [
                    { name: 'models/gemini-custom-1', displayName: 'Gemini Custom 1' },
                    { name: 'models/gemini-custom-2', displayName: 'Gemini Custom 2' },
                ],
            };
            await route.fulfill({ json });
        });

        await page.locator('[data-mode="free"]').click();

        // Enter Google key to trigger fetch
        await page.locator('[data-provider="google"] input').fill('valid-google-key');
        await expectConfiguredApiKeys(page, 1);

        // Navigate to Ensemble page
        await page.getByRole('button', { name: /continue/i }).click();

        // Check if custom models are displayed
        // Note: The model ID is sanitized (models/ removed)
        await expect(page.getByText('Gemini Custom 1')).toBeVisible();
        await expect(page.getByText('Gemini Custom 2')).toBeVisible();
    });
});
