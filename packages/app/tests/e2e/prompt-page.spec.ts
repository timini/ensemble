/**
 * Prompt Page E2E Tests (T162)
 *
 * Tests the /prompt page workflow:
 * - Page loads
 * - Shows ensemble configuration summary
 * - Prompt input field works
 * - Validation (non-empty prompt)
 * - Submit button disabled until valid
 * - Tips card visible
 * - Navigation to /review after submission
 */

import { test, expect, type Page } from '@playwright/test';

const enabledModels = (page: Page) =>
  page.locator('[data-testid^="model-card-"][data-disabled="false"]');

const addManualResponse = async (page: Page) => {
  await page.getByTestId('add-manual-response').click();
  await page.getByTestId('model-name-input').fill('Manual Test');
  await page.getByTestId('model-provider-input').fill('Provider');
  await page.getByTestId('response-textarea').fill('Manual preview content');
  await page.getByTestId('submit-button').click();
  await expect(page.getByTestId('manual-responses-list')).toContainText('Manual Test');
};

test.describe('Prompt Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate through config and ensemble pages first
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();

    // Configure at least 1 API key to enable Continue button
    await page.locator('[data-provider="openai"] input').fill('sk-test-openai-key');

    await page.getByRole('button', { name: /continue/i }).click();

    // Select 2 models on ensemble page
    await enabledModels(page).first().click();
    await enabledModels(page).nth(1).click();
    await page.getByRole('button', { name: /continue/i }).click();

    // Should now be on prompt page
    await expect(page).toHaveURL('/prompt');
  });

  test('loads prompt page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Ensemble AI/i);

    // Check for page hero heading
    await expect(page.locator('h1')).toBeVisible();

    // Check for workflow navigator
    await expect(page.getByTestId('workflow-navigator')).toBeVisible();
  });

  test('displays ensemble configuration summary', async ({ page }) => {
    // Check for ensemble configuration summary
    await expect(page.getByTestId('ensemble-configuration-summary')).toBeVisible();
  });

  test('displays prompt input field', async ({ page }) => {
    // Check for prompt input
    const promptInput = page.getByTestId('prompt-textarea');
    await expect(promptInput).toBeVisible();
    await expect(promptInput).toBeEditable();
  });

  test('displays tips card', async ({ page }) => {
    // Check for tips card
    await expect(page.getByTestId('prompt-tips')).toBeVisible();
    await expect(page.getByText(/tips for better prompts/i)).toBeVisible();
  });

  test('Generate Responses button is disabled when prompt is empty', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /generate responses/i });
    await expect(submitButton).toBeDisabled();
  });

  test('can enter prompt text', async ({ page }) => {
    const promptInput = page.getByTestId('prompt-textarea');

    // Type a prompt
    await promptInput.fill('What is the meaning of life?');

    // Verify the text was entered
    await expect(promptInput).toHaveValue('What is the meaning of life?');
  });

  test('Generate Responses button enables when prompt is valid', async ({ page }) => {
    const promptInput = page.getByTestId('prompt-textarea');
    const submitButton = page.getByRole('button', { name: /generate responses/i });

    // Initially disabled
    await expect(submitButton).toBeDisabled();

    // Enter prompt
    await promptInput.fill('What is the meaning of life?');

    // Now enabled
    await expect(submitButton).toBeEnabled();
  });

  test('navigates to /review after clicking Generate Responses', async ({ page }) => {
    // Enter prompt
    await page.getByTestId('prompt-textarea').fill('What is the meaning of life?');

    // Click Generate Responses button
    await page.getByRole('button', { name: /generate responses/i }).click();

    // Should navigate to review page
    await expect(page).toHaveURL('/review');
  });

  test('can navigate back to ensemble page', async ({ page }) => {
    // Click Back button
    await page.getByRole('button', { name: /back/i }).click();

    // Should navigate to ensemble page
    await expect(page).toHaveURL('/ensemble');
  });

  test('prompt text persists across page refreshes', async ({ page }) => {
    const promptInput = page.getByTestId('prompt-textarea');

    // Enter prompt
    await promptInput.fill('What is the meaning of life?');

    // Reload page
    await page.reload();

    // Prompt should still be there
    await expect(promptInput).toHaveValue('What is the meaning of life?');
  });

  test('displays keyboard hint', async ({ page }) => {
    // Check for keyboard hint (⌘+Enter or Cmd+Enter)
    await expect(page.getByText(/⌘\+enter|cmd\+enter/i)).toBeVisible();
  });

  test('workflow navigator shows prompt step as active', async ({ page }) => {
    // Check that prompt step is active in progress steps
    const promptStep = page.getByTestId('progress-step-prompt');
    await expect(promptStep).toBeVisible();
  });

  test('displays manual responses preview when manual responses exist', async ({ page }) => {
    await page.goto('/ensemble');
    await addManualResponse(page);
    await expect(page.getByRole('button', { name: /continue/i })).toBeEnabled();
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByTestId('manual-responses-preview')).toContainText('Manual Test');
  });
});
