import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ModelPicker, type ModelPickerOption } from './ModelPicker';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const options: ModelPickerOption[] = [
  { id: 'openai/gpt-6', name: 'GPT-6', provider: 'openai', group: 'OpenAI', price: '$1.25' },
  { id: 'anthropic/opus', name: 'Claude Opus 5.5', provider: 'anthropic', group: 'Anthropic' },
  { id: 'ollama/qwen3:14b', name: 'qwen3:14b', provider: 'openai-compatible', group: 'Ollama (local)', price: 'Free' },
];

const open = () => fireEvent.click(screen.getByTestId('model-picker-trigger'));

describe('ModelPicker', () => {
  it('says "Choose models" when none is selected and "Add model" otherwise', () => {
    const { rerender } = renderWithI18n(<ModelPicker options={options} selectedIds={[]} onToggle={() => undefined} />);
    expect(screen.getByTestId('model-picker-trigger')).toHaveTextContent('Choose models');
    rerender(<ModelPicker options={options} selectedIds={['openai/gpt-6']} onToggle={() => undefined} />);
    expect(screen.getByTestId('model-picker-trigger')).toHaveTextContent('Add model');
  });

  it('lists models by group with selection state and price', () => {
    renderWithI18n(<ModelPicker options={options} selectedIds={['openai/gpt-6']} onToggle={() => undefined} />);
    open();
    expect(screen.getByRole('group', { name: 'OpenAI' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Ollama (local)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GPT-6/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Claude Opus/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('$1.25')).toBeInTheDocument();
    expect(screen.getByTestId('model-picker-count')).toHaveTextContent('1 of 6 selected');
  });

  it('moves to the first match on Enter in the search box without submitting a form', () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    renderWithI18n(
      <form onSubmit={onSubmit}>
        <ModelPicker options={options} selectedIds={[]} onToggle={() => undefined} />
      </form>,
    );
    open();
    const search = screen.getByRole('searchbox', { name: 'Search models' });
    fireEvent.change(search, { target: { value: 'claude' } });
    const enter = fireEvent.keyDown(search, { key: 'Enter' });
    expect(enter).toBe(false);
    expect(screen.getByRole('button', { name: /Claude Opus/ })).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('counts the selection with plural forms in French', () => {
    const { rerender } = renderWithI18n(<ModelPicker options={options} selectedIds={['openai/gpt-6']} onToggle={() => undefined} />, { language: 'fr' });
    open();
    expect(screen.getByTestId('model-picker-count')).toHaveTextContent('1 sur 6 sélectionné');
    expect(screen.getByTestId('model-picker-count')).not.toHaveTextContent('sélectionnés');
    rerender(<ModelPicker options={options} selectedIds={['openai/gpt-6', 'anthropic/opus']} onToggle={() => undefined} />);
    expect(screen.getByTestId('model-picker-count')).toHaveTextContent('2 sur 6 sélectionnés');
  });

  it('toggles a model', () => {
    const onToggle = vi.fn();
    renderWithI18n(<ModelPicker options={options} selectedIds={[]} onToggle={onToggle} />);
    open();
    fireEvent.click(screen.getByRole('button', { name: /qwen3/ }));
    expect(onToggle).toHaveBeenCalledWith('ollama/qwen3:14b');
  });

  it('filters by the search text and says when nothing matches', () => {
    renderWithI18n(<ModelPicker options={options} selectedIds={[]} onToggle={() => undefined} />);
    open();
    const search = screen.getByRole('searchbox', { name: 'Search models' });
    expect(search).toHaveFocus();
    fireEvent.change(search, { target: { value: 'claude' } });
    expect(screen.getAllByTestId('model-picker-option')).toHaveLength(1);
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByTestId('model-picker-empty')).toHaveTextContent('No models match "zzz".');
  });

  it('blocks adding past the maximum but still allows removing', () => {
    const onToggle = vi.fn();
    renderWithI18n(<ModelPicker options={options} selectedIds={['openai/gpt-6', 'anthropic/opus']} max={2} onToggle={onToggle} />);
    open();
    const qwen = screen.getByRole('button', { name: /qwen3/ });
    expect(qwen).toBeDisabled();
    expect(screen.getByTestId('model-picker-limit')).toHaveTextContent('Up to 2 models');
    fireEvent.click(screen.getByRole('button', { name: /GPT-6/ }));
    expect(onToggle).toHaveBeenCalledWith('openai/gpt-6');
  });

  it('moves between options with the arrow keys', () => {
    renderWithI18n(<ModelPicker options={options} selectedIds={[]} onToggle={() => undefined} />);
    open();
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: /GPT-6/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('button', { name: /GPT-6/ }), { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: /Claude Opus/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('button', { name: /Claude Opus/ }), { key: 'ArrowUp' });
    expect(screen.getByRole('button', { name: /GPT-6/ })).toHaveFocus();
  });

  it('points to settings when there are no models', () => {
    renderWithI18n(<ModelPicker options={[]} selectedIds={[]} onToggle={() => undefined} />, { language: 'fr' });
    fireEvent.click(screen.getByTestId('model-picker-trigger'));
    expect(screen.getByTestId('model-picker-empty')).toHaveTextContent('Aucun modèle');
  });

  it('marks each option with its model id', () => {
    renderWithI18n(<ModelPicker options={[{ id: 'openai/gpt-6', name: 'GPT-6', provider: 'openai', group: 'OpenAI' }]} selectedIds={[]} onToggle={() => undefined} defaultOpen />);
    expect(screen.getByTestId('model-picker-option')).toHaveAttribute('data-model-id', 'openai/gpt-6');
  });
});
