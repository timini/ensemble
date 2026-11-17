import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Composer, type ComposerProps } from './Composer';
import { modelOptions, samplePrompt, threeModels } from './fixtures';
import { sampleEstimates } from '../../molecules/MethodMenu/fixtures';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

function setup(overrides: Partial<ComposerProps> = {}, language: 'en' | 'fr' = 'en') {
  const props: ComposerProps = {
    prompt: samplePrompt,
    onPromptChange: vi.fn(),
    onSubmit: vi.fn(),
    models: threeModels,
    onRemoveModel: vi.fn(),
    modelOptions,
    onToggleModel: vi.fn(),
    method: 'standard',
    onMethodChange: vi.fn(),
    estimates: sampleEstimates,
    ...overrides,
  };
  renderWithI18n(<Composer {...props} />, { language });
  return props;
}

describe('Composer', () => {
  it('labels the prompt and reports edits', () => {
    const props = setup({ prompt: '' });
    const prompt = screen.getByRole('textbox', { name: 'Your question' });
    expect(prompt).toHaveAttribute('placeholder', 'Ask a question where being wrong costs something');
    fireEvent.change(prompt, { target: { value: 'Why?' } });
    expect(props.onPromptChange).toHaveBeenCalledWith('Why?');
  });

  it('submits from the Ask button', () => {
    const props = setup();
    fireEvent.click(screen.getByTestId('composer-submit'));
    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it('submits with Ctrl+Enter or Cmd+Enter but not plain Enter', () => {
    const props = setup();
    const prompt = screen.getByRole('textbox');
    fireEvent.keyDown(prompt, { key: 'Enter' });
    expect(props.onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(prompt, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(prompt, { key: 'Enter', metaKey: true });
    expect(props.onSubmit).toHaveBeenCalledTimes(2);
  });

  it('cannot submit an empty prompt, with no models, or while running', () => {
    const props = setup({ prompt: '   ' });
    expect(screen.getByTestId('composer-submit')).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true });
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('cannot submit without models', () => {
    setup({ models: [] });
    expect(screen.getByTestId('composer-submit')).toBeDisabled();
    expect(screen.getByTestId('model-picker-trigger')).toHaveTextContent('Choose models');
  });

  it('shows Running and locks the models during a run', () => {
    setup({ running: true });
    const submit = screen.getByTestId('composer-submit');
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleName('Running');
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
  });

  it('still lets the user add an answer by hand during a run', () => {
    const onAddManualResponse = vi.fn();
    setup({ running: true, onAddManualResponse });
    fireEvent.click(screen.getByTestId('composer-options-trigger'));
    fireEvent.click(screen.getByTestId('composer-option-manual'));
    expect(onAddManualResponse).toHaveBeenCalled();
  });

  it('shows a chip per model and removes one', () => {
    const props = setup();
    expect(screen.getAllByTestId('model-chip')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Gemini 4 Carbon' }));
    expect(props.onRemoveModel).toHaveBeenCalledWith('google/gemini-4-carbon');
  });

  it('adds a model from the inline picker', () => {
    const props = setup();
    fireEvent.click(screen.getByTestId('model-picker-trigger'));
    fireEvent.click(screen.getByRole('button', { name: /qwen3/ }));
    expect(props.onToggleModel).toHaveBeenCalledWith('ollama/qwen3:14b');
  });

  it('does not run the ensemble when Enter is pressed in the model search', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByTestId('model-picker-trigger'));
    await user.type(screen.getByRole('searchbox', { name: 'Search models' }), 'qwen{Enter}');
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /qwen3/ })).toHaveFocus();
  });

  it('shows manual answers as chips and removes one', () => {
    const props = setup({ manualResponses: [{ id: 'm1', label: 'From my notes' }], onRemoveManualResponse: vi.fn() });
    const manual = screen.getAllByTestId('model-chip').find((c) => c.dataset.kind === 'manual');
    expect(manual).toHaveTextContent('From my notes');
    fireEvent.click(screen.getByRole('button', { name: 'Remove From my notes' }));
    expect(props.onRemoveManualResponse).toHaveBeenCalledWith('m1');
  });

  it('shows the method with its calls and cost and changes it', () => {
    const props = setup();
    expect(screen.getByTestId('method-menu-trigger')).toHaveTextContent('7 calls');
    fireEvent.click(screen.getByTestId('method-menu-trigger'));
    fireEvent.click(screen.getByRole('radio', { name: /Majority/ }));
    expect(props.onMethodChange).toHaveBeenCalledWith('majority');
  });

  it('opens the manual answer sheet from the options menu', () => {
    const onAddManualResponse = vi.fn();
    setup({ onAddManualResponse });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add an answer by hand' }));
    expect(onAddManualResponse).toHaveBeenCalledOnce();
  });

  it('shows the keyboard shortcut and translates to French', () => {
    setup({}, 'fr');
    expect(screen.getByRole('textbox', { name: 'Votre question' })).toBeInTheDocument();
    expect(screen.getByTestId('composer-shortcut')).toHaveTextContent('Ctrl Entrée pour demander');
    expect(screen.getByTestId('composer-submit')).toHaveAccessibleName('Demander');
  });
});
