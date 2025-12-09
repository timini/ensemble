import { test, expect } from '@playwright/test';

/**
 * Free Mode E2E Tests
 *
 * These tests require REAL API keys to run against actual provider APIs.
 * They are skipped in CI unless API key secrets are configured.
 *
 * To run locally:
 * 1. Set environment variables: OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
 * 2. Run: npx playwright test tests/e2e/free-mode/
 *
 * Required env vars for full test:
 * - TEST_OPENAI_API_KEY
 * - TEST_ANTHROPIC_API_KEY
 * - TEST_GOOGLE_API_KEY (optional)
 * - TEST_XAI_API_KEY (optional)
 */

const OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.TEST_ANTHROPIC_API_KEY;
const GOOGLE_API_KEY = process.env.TEST_GOOGLE_API_KEY;
const XAI_API_KEY = process.env.TEST_XAI_API_KEY;

const hasRequiredKeys = OPENAI_API_KEY && ANTHROPIC_API_KEY;

test.describe('Free Mode Workflow', () => {
  // Skip entire suite if required API keys are not available
  test.skip(!hasRequiredKeys, 'Skipping free mode tests - API keys not configured');

  test.beforeEach(async ({ page }) => {
    // Ensure we are in a clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('complete workflow with real API keys', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for real API calls

    // 1. Configuration Page
    await expect(page).toHaveURL('/config');

    // Select Free Mode
    await page.getByTestId('mode-card-free').click();

    // Check if API key inputs are visible
    await expect(page.getByTestId('api-key-configuration')).toBeVisible();

    // Enter real API keys
    await page.getByLabel('OpenAI API Key').fill(OPENAI_API_KEY!);
    await page.getByLabel('Anthropic API Key').fill(ANTHROPIC_API_KEY!);

    // Wait for validation to complete (real API validation may take time)
    await expect(page.getByTestId('api-key-configuration')).toContainText('2 API keys configured', { timeout: 30000 });

    // Continue
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextButton).toBeEnabled({ timeout: 10000 });
    await nextButton.click();

    // 2. Ensemble Page
    await expect(page).toHaveURL('/ensemble', { timeout: 15000 });

    // Select models (use models that we know exist)
    // Wait for models to load from real API
    await page.waitForTimeout(2000);

    // Click first available OpenAI model
    const openaiModel = page.locator('[data-testid^="model-card-gpt-"]').first();
    await expect(openaiModel).toBeVisible({ timeout: 10000 });
    await openaiModel.click();

    // Click first available Claude model
    const claudeModel = page.locator('[data-testid^="model-card-claude-"]').first();
    await expect(claudeModel).toBeVisible({ timeout: 10000 });
    await claudeModel.click();

    // Continue
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // 3. Prompt Page
    await expect(page).toHaveURL('/prompt');

    // Enter a simple prompt
    await page.getByPlaceholder('Enter your prompt here...').fill('Say "Hello from E2E test" and nothing else.');

    // Generate
    await page.getByRole('button', { name: 'Generate Responses' }).click();

    // 4. Review Page
    await expect(page).toHaveURL('/review');

    // Verify responses start streaming (cards appear)
    await expect(page.locator('[data-testid^="response-card-openai-"]').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid^="response-card-anthropic-"]').first()).toBeVisible({ timeout: 30000 });

    // Wait for completion (real APIs may take longer)
    await expect(page.locator('[data-testid^="response-card-openai-"]').first()).toHaveAttribute('data-status', 'complete', { timeout: 60000 });
    await expect(page.locator('[data-testid^="response-card-anthropic-"]').first()).toHaveAttribute('data-status', 'complete', { timeout: 60000 });

    // Verify token counts are displayed
    await expect(page.locator('[data-testid^="response-card-openai-"]').first()).toContainText('tokens');
    await expect(page.locator('[data-testid^="response-card-anthropic-"]').first()).toContainText('tokens');
  });

  test('validates API keys and shows errors for invalid keys', async ({ page }) => {
    await expect(page).toHaveURL('/config');
    await page.getByTestId('mode-card-free').click();

    // Enter an obviously invalid key
    await page.getByLabel('OpenAI API Key').fill('invalid-key-12345');

    // Wait for validation error to appear
    await expect(page.getByTestId('api-key-configuration')).toContainText(/error|invalid|incorrect/i, { timeout: 10000 });

    // Next button should remain disabled
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextButton).toBeDisabled();
  });

  // Optional: Test with Google/XAI if keys are available
  test.describe('Additional Providers', () => {
    test.skip(!GOOGLE_API_KEY, 'Google API key not configured');

    test('can configure Google API key', async ({ page }) => {
      await expect(page).toHaveURL('/config');
      await page.getByTestId('mode-card-free').click();

      await page.getByLabel('Google (Gemini) API Key').fill(GOOGLE_API_KEY!);

      // Wait for validation
      await expect(page.getByTestId('api-key-configuration')).toContainText('1 API key configured', { timeout: 30000 });
    });
  });
});
