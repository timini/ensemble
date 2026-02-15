/**
 * Review Page E2E Tests (T167)
 *
 * Tests the /review page workflow:
 * - Page loads
 * - Shows the submitted prompt
 * - Shows responses (empty state initially, Mock API in future)
 * - Shows agreement analysis (when responses exist)
 * - Shows consensus/meta-analysis (when exists)
 * - Navigation buttons work (Back, New Comparison, Start Over)
 */

import { test, expect, type Page } from '@playwright/test';

const enabledModels = (page: Page) =>
  page.locator('[data-testid^="model-card-"][data-disabled="false"]');

const addManualResponse = async (page: Page) => {
  await page.getByTestId('add-manual-response').click();
  await page.getByTestId('model-name-input').fill('Manual Test');
  await page.getByTestId('model-provider-input').fill('Provider');
  await page.getByTestId('response-textarea').fill('Manual review content');
  await page.getByTestId('submit-button').click();
  await expect(page.getByTestId('manual-responses-list')).toContainText('Manual Test');
};

test.describe('Review Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate through complete workflow: config → ensemble → prompt → review
    await page.goto('/config');
    await page.locator('[data-mode="free"]').click();

    // Configure at least 1 API key to enable Continue button
    await page.locator('[data-provider="openai"] input').fill('sk-test-openai-key');

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Select 2 models on ensemble page
    await enabledModels(page).first().click();
    await enabledModels(page).nth(1).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Enter prompt on prompt page
    await page.getByTestId('prompt-textarea').fill('What is the meaning of life?');
    await page.getByRole('button', { name: /generate responses/i }).click();

    // Should now be on review page
    await expect(page).toHaveURL('/review');
  });

  test('loads review page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Ensemble AI/i);

    // Check for page hero heading
    await expect(page.getByTestId('page-hero').locator('h1')).toBeVisible();

    // Check for workflow navigator
    await expect(page.getByTestId('workflow-navigator')).toBeVisible();
  });

  test('displays the submitted prompt', async ({ page }) => {
    // Check that the prompt is displayed
    await expect(page.getByText('What is the meaning of life?')).toBeVisible();

    // Check for "Your Prompt" label
    await expect(page.getByText(/your prompt/i)).toBeVisible();
  });

  test('displays prompt in a card component', async ({ page }) => {
    // The prompt should be within a Card component (has proper styling)
    const promptCard = page.locator('div').filter({ hasText: /your prompt/i }).first();
    await expect(promptCard).toBeVisible();
  });

  test('displays responses section', async ({ page }) => {
    // Check for responses heading (use role to avoid matching consensus awaiting text)
    await expect(page.getByRole('heading', { name: /model responses/i })).toBeVisible();
  });

  test('streams responses on review page', async ({ page }) => {
    await expect(page.locator('[data-testid^="response-card-"]').first()).toBeVisible({
      timeout: 20000,
    });
  });

  test('can navigate back to prompt page', async ({ page }) => {
    // Click Back button
    await page.getByRole('button', { name: /back to prompt/i }).click();

    // Should navigate to prompt page
    await expect(page).toHaveURL('/prompt');
  });

  test('can start new comparison', async ({ page }) => {
    // Click New Comparison button
    await page.getByRole('button', { name: /new comparison/i }).click();

    // Should navigate to prompt page
    await expect(page).toHaveURL('/prompt');
  });

  test('can start over from config', async ({ page }) => {
    // Click Start Over button
    await page.getByRole('button', { name: /start over/i }).click();

    // Should navigate to config page
    await expect(page).toHaveURL('/config');
  });

  test('displays all three navigation buttons', async ({ page }) => {
    // Check all three buttons are present
    await expect(page.getByRole('button', { name: /back to prompt/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new comparison/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start over/i })).toBeVisible();
  });

  test('redirects to prompt page if no prompt exists', async ({ page }) => {
    // Navigate directly to review page without a prompt
    await page.goto('/review');

    // Should redirect to prompt page
    await page.waitForURL('/prompt', { timeout: 5000 });
    await expect(page).toHaveURL('/prompt');
  });

  test('workflow shows review step as active', async ({ page }) => {
    // Check that review step is shown in progress steps
    const reviewStep = page.getByTestId('progress-step-review');
    await expect(reviewStep).toBeVisible();
    await expect(reviewStep).toHaveAttribute('data-active', 'true');
  });

  test('displays progress steps component', async ({ page }) => {
    // Check progress steps component is present
    const progressSteps = page.locator('[class*="progress"]').first();
    await expect(progressSteps).toBeVisible();
  });

  test('renders manual responses alongside AI responses', async ({ page }) => {
    await page.goto('/ensemble');
    await addManualResponse(page);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByTestId('prompt-textarea').fill('Manual response check');
    await page.getByRole('button', { name: /generate responses/i }).click();

    await expect(page.locator('[data-response-type="manual"]')).toContainText('Manual Test');
  });
});
