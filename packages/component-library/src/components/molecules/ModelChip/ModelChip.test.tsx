import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ModelChip } from './ModelChip';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ModelChip', () => {
  it('shows the model name with its logo', () => {
    renderWithI18n(<ModelChip name="Claude Opus 5.5" provider="anthropic" />);
    const chip = screen.getByTestId('model-chip');
    expect(chip).toHaveTextContent('Claude Opus 5.5');
    expect(chip).toHaveAttribute('data-kind', 'model');
  });

  it('removes the model from a labelled button', () => {
    const onRemove = vi.fn();
    renderWithI18n(<ModelChip name="GPT-6" provider="openai" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove GPT-6' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('has no remove button without onRemove', () => {
    renderWithI18n(<ModelChip name="GPT-6" provider="openai" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('marks an answer added by hand', () => {
    renderWithI18n(<ModelChip name="My notes" kind="manual" onRemove={() => undefined} />, { language: 'fr' });
    const chip = screen.getByTestId('model-chip');
    expect(chip).toHaveAttribute('data-kind', 'manual');
    expect(chip).toHaveAttribute('title', 'Ajoutée à la main');
    expect(screen.getByRole('button', { name: 'Retirer My notes' })).toBeInTheDocument();
  });
});
