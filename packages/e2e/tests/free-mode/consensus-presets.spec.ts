import { test, expect } from '@playwright/test';

/**
 * Free Mode Consensus Presets E2E Tests
 *
 * These tests require REAL API keys to run against actual provider APIs.
 * They are skipped in CI unless API key secrets are configured.
 */

const OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.TEST_ANTHROPIC_API_KEY;

const hasRequiredKeys = OPENAI_API_KEY && ANTHROPIC_API_KEY;

test.describe('Consensus Presets (Free Mode)', () => {
    // Skip entire suite if required API keys are not available
    test.skip(!hasRequiredKeys, 'Skipping free mode tests - API keys not configured');

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/config/);
    });

    test('should allow selecting consensus presets and generating consensus', async ({ page }) => {
        test.setTimeout(120000); // 2 minutes for full flow

        // Check we are on config page
        await expect(page).toHaveURL(/\/config/);

        // Select Free Mode
        await page.getByTestId('mode-card-free').click();

        // Check if API key inputs are visible
        await expect(page.getByTestId('api-key-configuration')).toBeVisible();

        // Enter real API keys (guaranteed to exist due to test.skip above)
        await page.getByLabel('OpenAI API Key').fill(OPENAI_API_KEY!);
        await page.getByLabel('Anthropic API Key').fill(ANTHROPIC_API_KEY!);

        // Next
        const nextButton = page.getByRole('button', { name: 'Next', exact: true });
        await expect(nextButton).toBeEnabled({ timeout: 10000 });
        await nextButton.click();

        // 1. Model Selection Step
        await expect(page).toHaveURL(/\/ensemble/);

        // Ensure we have 2 selected
        // Calculate expected text or check sidebar presence
        // If exact text is hard to find, check manual responses section or just the model cards are in "selected" state.

        // Check that Next button is enabled (implies isValid which requires >0 models)
        // Also check that the sidebar has items.

        await expect(page.getByTestId('ensemble-sidebar')).toBeVisible();

        // Check Next button is enabled
        await expect(page.getByRole('button', { name: /Next/i })).toBeEnabled();

        // Click Next
        await page.getByRole('button', { name: /Next/i }).click();

        // 2. Prompt Step
        await expect(page.getByText('Prompt Input')).toBeVisible();

        // CHECK CONSENSUS PRESETS UI
        await expect(page.getByText('Consensus Preset')).toBeVisible();
        await expect(page.getByTestId('preset-standard')).toBeChecked(); // Default

        // Select ELO
        await page.getByTestId('preset-elo').click();
        await expect(page.getByTestId('preset-elo')).toBeChecked();

        // Check Top N input appears
        await expect(page.getByText('Top N:')).toBeVisible();
        await expect(page.getByTestId('input-top-n')).toHaveValue('3'); // Default might be 3 but we only have 2 models selected?
        // Wait, if we have 2 models, max top N is 2. The input should reflect valid range or we might have set default 3.
        // Let's check logic: We selected 2 models. ELO requires 3 minimum logic in backend.

        // Let's go back and select 3 models to satisfy ELO requirement.
        await page.getByRole('button', { name: /Back/i }).click();
        await page.getByTestId('model-card-gemini-1.5-pro').click(); // Correct ID
        await page.getByRole('button', { name: /Next/i }).click();

        // Select ELO again
        await page.getByTestId('preset-elo').click();

        // Enter Prompt
        await page.getByPlaceholder('Enter your prompt here...').fill('Explain quantum computing briefly.');

        // Generate
        await page.getByRole('button', { name: /Generate Response/i }).click();

        // 3. Review Step
        await expect(page.getByText('Review Responses')).toBeVisible();

        // Wait for responses to complete (mock mode is fast)
        await expect(page.getByTestId('response-card-gpt-4o')).toContainText('lorem', { timeout: 10000 });

        // Check Consensus Card appears
        // It should appear once all responses are done.
        await expect(page.getByTestId('consensus-card')).toBeVisible({ timeout: 10000 });

        // Check it has content (Mock provider returns lorem ipsum)
        const consensusText = await page.getByTestId('consensus-card').textContent();
        expect(consensusText?.length).toBeGreaterThan(10);
        // expect(consensusText).toContain('lorem'); // Optional check for mock content
    });
});
