/**
 * Consensus Presets E2E Test (Mock Mode)
 *
 * Verifies the Consensus Presets UI and functionality using the Mock Provider.
 */
import { test, expect, type Page } from '@playwright/test';

const fillAndValidateKey = async (
    page: Page,
    provider: string,
    value: string,
    expectedCount: number,
) => {
    await page.locator(`[data-provider="${provider}"] input`).fill(value);
    const label =
        expectedCount === 1
            ? /1 API key configured/i
            : new RegExp(`${expectedCount} API keys configured`, 'i');
    await expect(page.getByText(label)).toBeVisible();
};

test.describe('Consensus Presets (Mock Mode)', () => {
    test('should verify ELO disabled state and Standard consensus generation', async ({ page }) => {
        test.setTimeout(90000);

        // ==========================================
        // STEP 1: Config Page
        // ==========================================
        await page.goto('/config');
        await page.locator('[data-mode="free"]').click();

        // Configure API keys
        await fillAndValidateKey(page, 'openai', 'sk-test-openai-key', 1);
        await fillAndValidateKey(page, 'anthropic', 'sk-ant-test-key', 2);

        await page.getByRole('button', { name: 'Next', exact: true }).click();

        // ==========================================
        // STEP 2: Ensemble Page - Select Models
        // ==========================================
        await expect(page).toHaveURL(/\/ensemble/);

        // Select only 2 models first to test ELO disabled state
        await page.getByRole('button', { name: '🤖 GPT-4o' }).first().click();
        await page.getByRole('button', { name: '🤖 GPT-4o Mini' }).click();

        await page.getByRole('button', { name: 'Next', exact: true }).click();

        // ==========================================
        // STEP 3: Prompt Page - Check ELO disabled
        // ==========================================
        await expect(page).toHaveURL(/\/prompt/);

        // Check ELO and Council are disabled (only 2 models)
        await expect(page.getByTestId('preset-elo')).toBeDisabled();
        await expect(page.getByTestId('preset-council')).toBeDisabled();

        // Check min-models warning message is visible
        await expect(page.getByTestId('preset-min-models-warning')).toBeVisible();

        // Standard and majority should be enabled
        await expect(page.getByTestId('preset-standard')).toBeChecked();
        await expect(page.getByTestId('preset-majority')).toBeEnabled();

        // Enter Prompt and generate
        await page.getByTestId('prompt-textarea').fill('Test prompt for consensus');
        await page.getByRole('button', { name: /generate responses/i }).click();

        // ==========================================
        // STEP 4: Review Page - Check Consensus
        // ==========================================
        await expect(page).toHaveURL(/\/review/);

        // Wait for responses (using response card locators from existing tests)
        const firstCard = page.locator('[data-testid^="response-card-"]').first();
        await expect(firstCard).toBeVisible({ timeout: 15000 });

        // Wait for consensus card
        await expect(page.getByTestId('consensus-card')).toBeVisible({ timeout: 30000 });

        // Check content
        const consensusCard = page.getByTestId('consensus-card');
        const text = await consensusCard.textContent();
        expect(text?.length).toBeGreaterThan(20);
    });
});
