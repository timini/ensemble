/**
 * Full Workflow E2E Test (T175)
 *
 * Tests the complete user journey through all 4 pages in Mock mode:
 * 1. Config: Select Free mode, configure API keys
 * 2. Ensemble: Select 3 models, designate summarizer
 * 3. Prompt: Enter prompt and submit
 * 4. Review: View responses, navigate between pages
 *
 * This test validates the entire application flow end-to-end.
 */

import { test, expect, type Page } from '@playwright/test';

const enabledModels = (page: Page) =>
  page.locator('[data-testid^="model-card-"][data-disabled="false"]');

const expectConfiguredApiKeys = async (page: Page, count: number) => {
  const label =
    count === 1
      ? /1 API key configured/i
      : new RegExp(`${count} API keys configured`, 'i');
  await expect(page.getByText(label)).toBeVisible();
};

const fillAndValidateKey = async (
  page: Page,
  provider: string,
  value: string,
  expectedCount: number,
) => {
  await page.locator(`[data-provider="${provider}"] input`).fill(value);
  await expectConfiguredApiKeys(page, expectedCount);
};

test.describe('Full Workflow - Mock Mode', () => {
  test('completes full user journey from config to review', async ({ page }) => {
    // Mock streaming can take several seconds per response card; give enough headroom
    test.setTimeout(90_000);
    // ==========================================
    // STEP 1: Config Page - Mode Selection & API Keys
    // ==========================================
    await test.step('Navigate to config page and select Free mode', async () => {
      await page.goto('/config');

      // Verify config page loaded
      await expect(page).toHaveTitle(/Ensemble AI/i);
      await expect(page.getByText(/configuration/i).first()).toBeVisible();

      // Progress indicator should show step 1
      await expect(page.getByTestId('progress-step-container-config')).toBeVisible();

      // Next button should be disabled initially
      const nextButton = page.getByRole('button', { name: 'Next', exact: true });
      await expect(nextButton).toBeDisabled();

      // Select Free mode
      await page.locator('[data-mode="free"]').click();
      await expect(page.locator('[data-mode="free"]')).toHaveAttribute('data-selected', 'true');
    });

    await test.step('Configure API keys for multiple providers', async () => {
      await fillAndValidateKey(
        page,
        'openai',
        'sk-test-openai-key-full-workflow',
        1,
      );
      await fillAndValidateKey(
        page,
        'anthropic',
        'sk-ant-test-anthropic-key',
        2,
      );
      await fillAndValidateKey(
        page,
        'google',
        'test-google-api-key-12345',
        3,
      );

      // Next button should now be enabled
      await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
    });

    await test.step('Navigate to ensemble page', async () => {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page).toHaveURL('/ensemble');
    });

    // ==========================================
    // STEP 2: Ensemble Page - Model Selection
    // ==========================================
    await test.step('Select 3 models on ensemble page', async () => {
      // Verify ensemble page loaded
      await expect(page.getByTestId('model-selection-list')).toBeVisible();

      // Progress indicator should show step 2
      await expect(page.getByTestId('progress-step-container-ensemble')).toBeVisible();

      // Next button disabled initially (need min 2 models)
      const nextButton = page.getByRole('button', { name: 'Next', exact: true });
      await expect(nextButton).toBeDisabled();

      // Select 3 models
      await enabledModels(page).first().click();
      await enabledModels(page).nth(1).click();
      await enabledModels(page).nth(2).click();

      // Verify 3 models selected
      const selectedCards = page.locator('[data-testid^="model-card-"][data-selected="true"]');
      await expect(selectedCards).toHaveCount(3);

      // Next button should now be enabled
      await expect(nextButton).toBeEnabled();
    });

    await test.step('Designate summarizer model', async () => {
      // Click summarizer button on second model
      const summarizerButton = page.locator('[data-testid^="summarizer-button-"]').nth(1);
      await summarizerButton.click();

      // Verify summarizer designation
      const summarizerCard = page.locator('[data-testid^="model-card-"][data-summarizer="true"]');
      await expect(summarizerCard).toHaveCount(1);
    });

    await test.step('Navigate to prompt page', async () => {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page).toHaveURL('/prompt');
    });

    // ==========================================
    // STEP 3: Prompt Page - Enter Prompt
    // ==========================================
    await test.step('Enter prompt on prompt page', async () => {
      // Verify prompt page loaded
      await expect(page.getByTestId('prompt-input-with-hint')).toBeVisible();

      // Progress indicator should show step 3
      await expect(page.getByTestId('progress-step-container-prompt')).toBeVisible();

      // Verify ensemble configuration summary is visible
      await expect(page.getByTestId('ensemble-configuration-summary')).toBeVisible();

      // Verify tips card is visible
      await expect(page.getByTestId('prompt-tips')).toBeVisible();

      // Verify keyboard hint is visible
      await expect(page.getByText(/⌘\+enter|cmd\+enter/i)).toBeVisible();

      // Generate Responses button should be disabled initially
      const generateButton = page.getByRole('button', { name: /generate responses/i });
      await expect(generateButton).toBeDisabled();
    });

    await test.step('Enter a valid prompt', async () => {
      const promptText = 'What are the key differences between functional and object-oriented programming? Please provide concrete examples and discuss the trade-offs of each approach.';

      await page.getByTestId('prompt-textarea').fill(promptText);

      // Verify prompt was entered
      await expect(page.getByTestId('prompt-textarea')).toHaveValue(promptText);

      // Generate Responses button should now be enabled
      await expect(page.getByRole('button', { name: /generate responses/i })).toBeEnabled();
    });

    await test.step('Submit prompt and navigate to review page', async () => {
      await page.getByRole('button', { name: /generate responses/i }).click();
      await expect(page).toHaveURL('/review');
    });

    // ==========================================
    // STEP 4: Review Page - View Results
    // ==========================================
    await test.step('Verify review page displays prompt', async () => {
      // Progress indicator should show step 4
      await expect(page.getByTestId('progress-step-container-review')).toBeVisible();

      // Verify the submitted prompt is displayed
      await expect(page.getByText(/What are the key differences between functional and object-oriented programming/i)).toBeVisible();

      // Verify prompt label is visible
      await expect(page.getByText(/your prompt/i)).toBeVisible();
    });

    await test.step('Verify navigation buttons are present', async () => {
      // Verify all 3 navigation buttons
      await expect(page.getByRole('button', { name: /back to prompt/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /new comparison/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /start over/i })).toBeVisible();
    });

    // ==========================================
    // STEP 5: Navigation Testing
    // ==========================================
    await test.step('Test "Back to Prompt" navigation', async () => {
      await page.getByRole('button', { name: /back to prompt/i }).click();
      await expect(page).toHaveURL('/prompt');

      // Verify prompt is still filled
      await expect(page.getByTestId('prompt-textarea')).not.toHaveValue('');

      // Navigate back to review
      await page.getByRole('button', { name: /generate responses/i }).click();
      await expect(page).toHaveURL('/review');
    });

    await test.step('Test "New Comparison" navigation', async () => {
      await page.getByRole('button', { name: /new comparison/i }).click();
      await expect(page).toHaveURL('/prompt');

      // Should be able to edit prompt and resubmit
      await expect(page.getByTestId('prompt-textarea')).toBeVisible();

      // Navigate back to review
      await page.getByRole('button', { name: /generate responses/i }).click();
      await expect(page).toHaveURL('/review');
    });

    await test.step('Test "Start Over" navigation', async () => {
      // Wait for response cards to render so layout is stable before clicking navigation.
      const responseCards = page.locator('[data-testid^="response-card-"]');
      await expect(responseCards.first()).toBeVisible({ timeout: 10000 });

      const startOverButton = page.getByRole('button', { name: /start over/i });
      await expect(startOverButton).toBeVisible({ timeout: 10000 });
      await expect(startOverButton).toBeEnabled({ timeout: 10000 });
      await startOverButton.scrollIntoViewIfNeeded();
      // Brief pause to let any final layout shifts settle
      await page.waitForTimeout(500);

      await Promise.all([
        page.waitForURL('**/config', { timeout: 15000 }),
        startOverButton.click({ timeout: 10000 }),
      ]);

      await expect(page).toHaveURL(/\/config$/, { timeout: 10000 });

      // Verify we're back at config page
      await expect(page.locator('[data-mode="free"]')).toBeVisible();

      // Previous selections should persist (localStorage)
      await expect(page.locator('[data-mode="free"]')).toHaveAttribute('data-selected', 'true');
    });

    // ==========================================
    // STEP 6: State Persistence Verification
    // ==========================================
    await test.step('Verify state persists across page refresh', async () => {
      // Reload the config page
      await page.reload();

      // Free mode should still be selected
      await expect(page.locator('[data-mode="free"]')).toHaveAttribute('data-selected', 'true');

      // Navigate to ensemble page (wait for keys to be revalidated)
      await expectConfiguredApiKeys(page, 3);
      const nextButton = page.getByRole('button', { name: 'Next', exact: true });
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      // Models should still be selected
      const selectedCards = page.locator('[data-testid^="model-card-"][data-selected="true"]');
      await expect(selectedCards).toHaveCount(3);
    });
  });

  test('can complete workflow with minimum configuration', async ({ page }) => {
    await test.step('Configure with minimal settings', async () => {
      // Go to config
      await page.goto('/config');

      // Select Free mode with only 1 API key
      await page.locator('[data-mode="free"]').click();
      await fillAndValidateKey(page, 'openai', 'sk-test-minimal', 1);
      const nextButton = page.getByRole('button', { name: 'Next', exact: true });
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      // Select exactly 2 models (minimum)
      await page.locator('[data-testid^="model-card-"]').first().click();
      await page.locator('[data-testid^="model-card-"]').nth(1).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      // Enter minimal prompt
      await page.getByTestId('prompt-textarea').fill('Test prompt');
      await page.getByRole('button', { name: /generate responses/i }).click();

      // Should reach review page
      await expect(page).toHaveURL('/review');
      await expect(page.getByText(/test prompt/i)).toBeVisible();
    });
  });

  test('validates workflow step order', async ({ page }) => {
    await test.step('Cannot skip steps - must follow workflow order', async () => {
      // Try to navigate directly to ensemble without completing config
      await page.goto('/ensemble');

      // Should work (no forced redirect), but Next will be disabled
      // until proper configuration is done
      const nextButton = page.getByRole('button', { name: 'Next', exact: true });
      await expect(nextButton).toBeDisabled();

      // Navigate properly through config first
      await page.goto('/config');
      await page.locator('[data-mode="free"]').click();
      await fillAndValidateKey(page, 'openai', 'sk-test-key', 1);
      const nextButtonConfig = page.getByRole('button', { name: 'Next', exact: true });
      await expect(nextButtonConfig).toBeEnabled();
      await nextButtonConfig.click();

      // Now ensemble Next should work after selecting models
      await page.locator('[data-testid^="model-card-"]').first().click();
      await page.locator('[data-testid^="model-card-"]').nth(1).click();
      await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
    });
  });
});
