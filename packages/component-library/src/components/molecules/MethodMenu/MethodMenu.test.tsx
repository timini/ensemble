import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MethodMenu } from './MethodMenu';
import { estimate, sampleEstimates } from './fixtures';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const summarizers = [
  { id: 'anthropic/opus', name: 'Claude Opus 5.5' },
  { id: 'openai/gpt-6', name: 'GPT-6' },
];

describe('MethodMenu', () => {
  it('shows the current method with its calls and cost on the trigger', () => {
    renderWithI18n(<MethodMenu method="standard" onMethodChange={() => undefined} estimates={sampleEstimates} />);
    const trigger = screen.getByTestId('method-menu-trigger');
    expect(trigger).toHaveTextContent('Standard');
    expect(trigger).toHaveTextContent('7 calls');
    expect(trigger).toHaveTextContent('$0.0040 to $0.012');
  });

  it('lists every method with its calls and cost', () => {
    renderWithI18n(<MethodMenu method="standard" onMethodChange={() => undefined} estimates={sampleEstimates} />);
    fireEvent.click(screen.getByTestId('method-menu-trigger'));
    const group = screen.getByRole('radiogroup', { name: 'Consensus method' });
    expect(group).toBeInTheDocument();
    const council = screen.getByRole('radio', { name: /Council/ });
    expect(council).toHaveTextContent('22 calls');
    expect(council).toHaveTextContent('$0.018 to $0.064');
    expect(screen.getByRole('radio', { name: /Standard/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('picks a method and closes', () => {
    const onMethodChange = vi.fn();
    renderWithI18n(<MethodMenu method="standard" onMethodChange={onMethodChange} estimates={sampleEstimates} />);
    fireEvent.click(screen.getByTestId('method-menu-trigger'));
    fireEvent.click(screen.getByRole('radio', { name: /Ranked/ }));
    expect(onMethodChange).toHaveBeenCalledWith('elo');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByTestId('method-menu-trigger')).toHaveFocus();
  });

  it('disables a method that needs more answers', () => {
    const estimates = { ...sampleEstimates, council: estimate(8, 0.01, 0.02, { available: false }) };
    renderWithI18n(<MethodMenu method="standard" onMethodChange={() => undefined} estimates={estimates} />);
    fireEvent.click(screen.getByTestId('method-menu-trigger'));
    const council = screen.getByRole('radio', { name: /Council/ });
    expect(council).toBeDisabled();
    expect(council).toHaveTextContent('Needs 3 or more answers');
  });

  it('moves between methods with the arrow keys', () => {
    renderWithI18n(<MethodMenu method="standard" onMethodChange={() => undefined} estimates={sampleEstimates} />);
    fireEvent.click(screen.getByTestId('method-menu-trigger'));
    const standard = screen.getByRole('radio', { name: /Standard/ });
    expect(standard).toHaveFocus();
    fireEvent.keyDown(standard, { key: 'ArrowDown' });
    expect(screen.getByRole('radio', { name: /Majority/ })).toHaveFocus();
  });

  it('chooses the summarizer', () => {
    const onSummarizerChange = vi.fn();
    renderWithI18n(
      <MethodMenu
        method="standard"
        onMethodChange={() => undefined}
        estimates={sampleEstimates}
        summarizers={summarizers}
        summarizerId="anthropic/opus"
        onSummarizerChange={onSummarizerChange}
      />,
    );
    fireEvent.click(screen.getByTestId('method-menu-trigger'));
    const select = screen.getByRole('combobox', { name: 'Merged by' });
    expect(select).toHaveValue('anthropic/opus');
    fireEvent.change(select, { target: { value: 'openai/gpt-6' } });
    expect(onSummarizerChange).toHaveBeenCalledWith('openai/gpt-6');
  });

  it('shows no counts for a method with no estimate yet', () => {
    renderWithI18n(<MethodMenu method="majority" onMethodChange={() => undefined} estimates={{}} />, { language: 'fr' });
    const trigger = screen.getByTestId('method-menu-trigger');
    expect(trigger).toHaveTextContent('Majorité');
    expect(trigger).not.toHaveTextContent('appel');
  });
});
