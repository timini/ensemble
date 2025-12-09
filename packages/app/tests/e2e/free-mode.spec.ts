import { test, expect } from '@playwright/test';

test.describe('Free Mode Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we are in a clean state
    await page.goto('/');
    // If redirected to config, we are good. If not, maybe clear storage.
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('complete workflow with API key configuration', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    // 1. Configuration Page
    await expect(page).toHaveURL('/config');

    // Select Free Mode
    await page.getByTestId('mode-card-free').click();

    // Check if API key inputs are visible
    await expect(page.getByTestId('api-key-configuration')).toBeVisible();

    // Enter dummy API keys (Mock mode accepts anything)
    await page.getByLabel('OpenAI API Key').fill('sk-dummy-openai');
    await page.getByLabel('Anthropic API Key').fill('sk-dummy-anthropic');

    // Wait for validation (Mock client delays 100-300ms)
    await expect(page.getByTestId('api-key-configuration')).toContainText('2 API keys configured');

    // Continue
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextButton).toBeEnabled();

    const btnText = await nextButton.innerText();
    console.log(`Found button innerText: "${btnText}"`);

    // Wait for stability
    await page.waitForTimeout(500); // Reduced delay

    console.log('Clicking Next button...');
    await nextButton.click();

    // 2. Ensemble Page
    await expect(page).toHaveURL('/ensemble', { timeout: 15000 });

    // Select models
    await page.getByTestId('model-card-gpt-4o').click();
    await page.getByTestId('model-card-claude-3-5-sonnet').click();

    // Continue
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // 3. Prompt Page
    await expect(page).toHaveURL('/prompt');

    // Enter prompt
    await page.getByPlaceholder('Enter your prompt here...').fill('Tell me a joke about testing.');

    // Generate
    await page.getByRole('button', { name: 'Generate Responses' }).click();

    // 4. Review Page
    await expect(page).toHaveURL('/review');

    // Verify responses are streaming/complete (using prefix matching due to timestamp in IDs)
    await expect(page.locator('[data-testid^="response-card-openai-gpt-4o-"]')).toBeVisible();
    await expect(page.locator('[data-testid^="response-card-anthropic-claude-3-5-sonnet-"]')).toBeVisible();

    // Wait for completion
    await expect(page.locator('[data-testid^="response-card-openai-gpt-4o-"]')).toHaveAttribute('data-status', 'complete', { timeout: 30000 });
    await expect(page.locator('[data-testid^="response-card-anthropic-claude-3-5-sonnet-"]')).toHaveAttribute('data-status', 'complete', { timeout: 30000 });

    // Verify token counts are displayed
    await expect(page.locator('[data-testid^="response-card-openai-gpt-4o-"]')).toContainText('tokens');
    await expect(page.locator('[data-testid^="response-card-anthropic-claude-3-5-sonnet-"]')).toContainText('tokens');

    // 5. Verify Google and XAI (Additional run or reset)
    // For simplicity in this test, we'll just verify they are available in the config if we were to select them
    // But since we already ran the flow, let's just ensure the code supports them by checking the config page again
    await page.goto('/config');
    await page.getByTestId('mode-card-free').click();
    await page.getByLabel('Google (Gemini) API Key').fill('AIza-dummy');
    await page.getByLabel('xAI (Grok) API Key').fill('xai-dummy');
    await expect(page.getByTestId('api-key-configuration')).toContainText('4 API keys configured');
  });
});