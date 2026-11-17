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
        await page.getByTestId('model-card-gpt-6-astra').click();
        await page.getByTestId('model-card-gpt-6-luna').click();

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

    test('shows the majority vote breakdown with a winner', async ({ page }) => {
        test.setTimeout(90000);

        await page.goto('/config');
        await page.locator('[data-mode="free"]').click();
        await fillAndValidateKey(page, 'openai', 'sk-test-openai-key', 1);
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        await expect(page).toHaveURL(/\/ensemble/);
        await page.getByTestId('model-card-gpt-6-astra').click();
        await page.getByTestId('model-card-gpt-6-luna').click();
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        await expect(page).toHaveURL(/\/prompt/);
        await page.getByTestId('preset-majority').click();
        await expect(page.getByTestId('preset-majority')).toBeChecked();
        await page.getByTestId('prompt-textarea').fill('What is 6 times 7?');
        await page.getByRole('button', { name: /generate responses/i }).click();

        await expect(page).toHaveURL(/\/review/);
        const breakdown = page.getByTestId('majority-vote-breakdown');
        await expect(breakdown).toBeVisible({ timeout: 30000 });
        await expect(breakdown).toHaveAttribute('data-outcome', 'winner');
        await expect(page.getByTestId('majority-vote-summary')).toHaveText('42 won with 2 of 2 votes.');
    });
});

