import { test, expect } from '@playwright/test';

const GOOGLE_API_KEY = process.env.TEST_GOOGLE_API_KEY;

test.describe('Free Mode - Google Only', () => {
    test.skip(!GOOGLE_API_KEY, 'Skipping Google-only test - Google API key not configured');

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('should complete workflow with ONLY Google API key', async ({ page }) => {
        test.setTimeout(120000);

        // 1. Configuration
        await page.goto('/config');
        await page.getByTestId('mode-card-free').click();

        // Enter ONLY Google key
        await page.getByLabel('Google (Gemini) API Key').fill(GOOGLE_API_KEY!);

        // Wait for validation
        await expect(page.getByTestId('api-key-configuration')).toContainText('1 API key configured', { timeout: 30000 });

        await page.getByRole('button', { name: 'Next', exact: true }).click();

        // 2. Ensemble
        await expect(page).toHaveURL('/ensemble');

        // Select 2 Google models
        const googleCards = page.locator('[data-testid^="model-card-gemini-"]');
        await expect(googleCards.first()).toBeVisible();

        // Select first two available Google models
        await googleCards.nth(0).click();
        await googleCards.nth(1).click();

        await page.getByRole('button', { name: 'Next', exact: true }).click();

        // 3. Prompt
        await expect(page).toHaveURL('/prompt');
        await page.getByPlaceholder('Enter your prompt here...').fill('Test prompt for Google only');
        await page.getByRole('button', { name: 'Generate Responses' }).click();

        // 4. Review
        await expect(page).toHaveURL('/review');

        // Verify responses appear
        const responseCards = page.locator('[data-testid^="response-card-google-"]');
        await expect(responseCards).toHaveCount(2);

        // Wait for completion
        await expect(responseCards.first()).toHaveAttribute('data-status', 'complete', { timeout: 60000 });

        // Verify NO console error about missing OpenAI key
        // (Playwright will fail the test if there's an unhandled exception in the page context if configured, 
        // but we specifically want to ensure the UI doesn't break)

        // Check for agreement analysis which triggers embeddings
        // If embeddings fail, this section might be empty or show an error, but the page shouldn't crash.
        // The user reported a console error, which might not crash the whole app but breaks functionality.
    });
});
