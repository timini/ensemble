/**
 * The workspace (/workspace), the app's one working screen, in mock mode.
 *
 * Replaces the old wizard specs (full workflow, ensemble, prompt and review
 * pages): first visit, picking models, the composer, the cost before and
 * after a run, the answers, the agreement score and the consensus, and
 * starting a new question.
 */
import { test, expect } from '@playwright/test';
import {
  agreement,
  answerCard,
  ask,
  closeSettings,
  configureKeys,
  consensus,
  modelChip,
  openModelPicker,
  pickModels,
  pickerOption,
  selectMockModels,
  startMockRun,
  waitForConsensus,
} from './runHelpers';

test.describe('Workspace: first visit', () => {
  test('shows what the product does, the composer and how to start', async ({ page }) => {
    await page.goto('/workspace');
    await expect(page).toHaveTitle(/Ensemble AI/i);
    await expect(page.getByTestId('workspace-heading').getByRole('heading', { level: 1 })).toHaveText(
      'Ask several models at once.',
    );
    await expect(page.getByTestId('composer')).toBeVisible();
    // No key or endpoint yet: one clear way in, and nothing to run.
    await expect(page.getByTestId('workspace-setup')).toBeVisible();
    await expect(page.getByTestId('workspace-setup')).toContainText('never sent to our server');
    await expect(page.getByTestId('composer-submit')).toBeDisabled();
    await expect(page.getByTestId('workspace-examples')).toHaveCount(0);
  });

  test('the setup card opens settings, and one key is enough to start', async ({ page }) => {
    await page.goto('/workspace');
    await page.getByTestId('workspace-setup-open').click();
    const sheet = page.getByTestId('settings-sheet');
    await expect(sheet).toBeVisible();
    await sheet.locator('[data-provider="openai"] input').fill('sk-test-openai-key');
    await expect(sheet.getByText(/1 API key configured/i)).toBeVisible();
    await closeSettings(page);

    await expect(page.getByTestId('workspace-setup')).toHaveCount(0);
    await expect(page.getByTestId('workspace-examples')).toBeVisible();
  });

  test('an example question fills the prompt', async ({ page }) => {
    await configureKeys(page, ['openai']);
    const example = page.getByTestId('workspace-example').first();
    const question = await example.textContent();
    await example.click();
    await expect(page.getByTestId('composer-prompt')).toHaveValue(question ?? '');
  });
});

test.describe('Workspace: models', () => {
  test('the picker offers only models whose provider has a working key', async ({ page }) => {
    await configureKeys(page, ['openai']);
    await openModelPicker(page);
    await expect(pickerOption(page, 'gpt-6-astra')).toBeVisible();
    await expect(pickerOption(page, 'gemini-4-hydrogen')).toHaveCount(0);
    await expect(pickerOption(page, 'claude-sonnet-5-5')).toHaveCount(0);
  });

  test('adds and removes models as chips', async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna']);
    await expect(page.getByTestId('model-chip')).toHaveCount(2);
    await modelChip(page, 'gpt-6-astra').getByTestId('model-chip-remove').click();
    await expect(page.getByTestId('model-chip')).toHaveCount(1);
    await expect(modelChip(page, 'gpt-6-luna')).toBeVisible();
  });

  test('takes up to 6 models in one run', async ({ page }) => {
    await configureKeys(page, ['openai', 'anthropic', 'google', 'xai']);
    const six = ['gpt-6-astra', 'gpt-6-luna', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'gemini-4-hydrogen', 'grok-4.7'];
    await openModelPicker(page);
    for (const model of six) {
      await pickerOption(page, model).click();
      await expect(pickerOption(page, model)).toHaveAttribute('aria-pressed', 'true');
    }
    await expect(page.getByTestId('model-picker-count')).toHaveText('6 of 6 selected');
    await expect(page.getByTestId('model-picker-limit')).toBeVisible();
    await expect(pickerOption(page, 'grok-4.3')).toBeDisabled();
  });

  test('stores model ids, not display names, and keeps them after a reload', async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna']);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ensemble-ai-store') ?? '{}'));
    expect(stored.selectedModels.map((m: { model: string }) => m.model)).toEqual(['gpt-6-astra', 'gpt-6-luna']);

    await page.reload();
    await expect(modelChip(page, 'gpt-6-astra')).toBeVisible();
    await expect(modelChip(page, 'gpt-6-luna')).toBeVisible();
  });
});

test.describe('Workspace: composer', () => {
  test('asks only with a question and at least one model or answer', async ({ page }) => {
    await configureKeys(page, ['openai']);
    const submit = page.getByTestId('composer-submit');
    await page.getByTestId('composer-prompt').fill('What is the meaning of life?');
    await expect(submit).toBeDisabled();
    await pickModels(page, ['gpt-6-astra']);
    await expect(submit).toBeEnabled();
    await page.getByTestId('composer-prompt').fill('   ');
    await expect(submit).toBeDisabled();
  });

  test('keeps the draft across a reload', async ({ page }) => {
    await configureKeys(page, ['openai']);
    await page.getByTestId('composer-prompt').fill('What is the meaning of life?');
    await page.reload();
    await expect(page.getByTestId('composer-prompt')).toHaveValue('What is the meaning of life?');
  });

  test('shows the calls and cost before asking', async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna']);
    await page.getByTestId('composer-prompt').fill('What is 6 times 7?');
    // Standard with 2 models: 2 answers, 1 synthesis call and 2 embedding calls.
    const trigger = page.getByTestId('method-menu-trigger');
    await expect(trigger).toContainText('5 calls');
    await expect(trigger).toContainText('$');
    await trigger.click();
    await expect(page.getByTestId('method-option-standard')).toContainText('5 calls');
    await expect(page.getByTestId('method-option-majority')).toContainText('calls');
  });

  test('asks with Ctrl or Cmd + Enter', async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna']);
    await expect(page.getByTestId('composer-shortcut')).toBeVisible();
    await page.getByTestId('composer-prompt').fill('Keyboard question');
    await page.getByTestId('composer-prompt').press('ControlOrMeta+Enter');
    await expect(page.getByTestId('run-result')).toBeVisible();
  });

  test('changes the summarizer and keeps it after a reload', async ({ page }) => {
    await selectMockModels(page, ['gpt-6-astra', 'gpt-6-luna']);
    await page.getByTestId('method-menu-trigger').click();
    const summarizer = page.getByTestId('method-menu-summarizer');
    await expect(summarizer).toHaveValue('gpt-6-astra');
    await summarizer.selectOption('gpt-6-luna');

    await page.reload();
    await page.getByTestId('method-menu-trigger').click();
    await expect(page.getByTestId('method-menu-summarizer')).toHaveValue('gpt-6-luna');
  });
});

test.describe('Workspace: a run', () => {
  test.setTimeout(90_000);

  test('streams every answer, then scores agreement, writes the consensus and shows the cost', async ({ page }) => {
    await startMockRun(page, {
      models: ['gpt-6-astra', 'gpt-6-luna', 'claude-sonnet-5-5'],
      prompt: 'What are the key differences between functional and object-oriented programming?',
    });

    await expect(page.getByTestId('answer-card')).toHaveCount(3);
    for (const model of ['gpt-6-astra', 'gpt-6-luna', 'claude-sonnet-5-5']) {
      await expect(answerCard(page, model)).toHaveAttribute('data-status', 'complete', { timeout: 30_000 });
    }
    await expect(page.locator('[data-testid="answer-card"] [data-testid="response-error"]')).toHaveCount(0);

    await expect(agreement(page)).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
    await expect(page.getByTestId('agreement-pair')).toHaveCount(3);
    await waitForConsensus(page);
    expect((await page.getByTestId('consensus-answer').textContent())?.length).toBeGreaterThan(20);

    // Cost after the run: mock providers report no tokens, so it is estimated.
    const cost = consensus(page).getByTestId('run-cost-summary');
    await expect(cost).toHaveAttribute('data-variant', 'actual');
    await expect(cost.getByTestId('run-cost-amount')).toContainText('Estimated cost: $');
    await expect(cost.getByTestId('run-cost-calls')).toHaveText('7 model calls');
  });

  test('editing the ensemble after a run leaves the run on screen alone', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'] });
    await waitForConsensus(page);
    await modelChip(page, 'gpt-6-luna').getByTestId('model-chip-remove').click();
    await expect(page.getByTestId('answer-card')).toHaveCount(2);
    await expect(answerCard(page, 'gpt-6-luna')).toHaveAttribute('data-status', 'complete');
  });

  test('shows the question of the run once the composer holds a new draft', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'], prompt: 'First question' });
    await expect(page.getByTestId('run-prompt')).toHaveCount(0);
    await page.getByTestId('composer-prompt').fill('Draft of the next one');
    await expect(page.getByTestId('run-prompt')).toContainText('First question');
  });

  test('New question clears the run and the composer, and keeps the models', async ({ page }) => {
    await startMockRun(page, { models: ['gpt-6-astra', 'gpt-6-luna'] });
    await waitForConsensus(page);

    await page.getByTestId('history-new').click();
    await expect(page.getByTestId('run-result')).toHaveCount(0);
    await expect(page.getByTestId('composer-prompt')).toHaveValue('');
    await expect(page.getByTestId('model-chip')).toHaveCount(2);

    await ask(page, 'A different question');
    await expect(page.getByTestId('answer-card')).toHaveCount(2);
  });
});
