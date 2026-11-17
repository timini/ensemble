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
    // The cost stays visible on phones; the call count shows from 640 px.
    expect(screen.getByTestId('method-menu-cost')).not.toHaveClass('hidden');
    expect(screen.getByTestId('method-menu-calls')).toHaveClass('hidden', 'sm:inline');
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
    expect(council).toHaveTextContent('Needs at least 3 answers');
  });

  it('gives each method its own minimum with one answer', () => {
    const off = estimate(2, 0, 0, { available: false });
    const estimates = { standard: off, majority: off, elo: off, council: off };
    renderWithI18n(<MethodMenu method="standard" onMethodChange={() => undefined} estimates={estimates} />, { language: 'fr' });
    fireEvent.click(screen.getByTestId('method-menu-trigger'));
    expect(screen.getByTestId('method-option-standard')).toHaveTextContent('Nécessite au moins 2 réponses');
    expect(screen.getByTestId('method-option-majority')).toHaveTextContent('Nécessite au moins 2 réponses');
    expect(screen.getByTestId('method-option-elo')).toHaveTextContent('Nécessite au moins 3 réponses');
    expect(screen.getByTestId('method-option-council')).toHaveTextContent('Nécessite au moins 3 réponses');
  });

  it('moves between methods with the arrow keys and checks the one it lands on', () => {
    const onMethodChange = vi.fn();
    renderWithI18n(<MethodMenu method="standard" onMethodChange={onMethodChange} estimates={sampleEstimates} />);
    fireEvent.click(screen.getByTestId('method-menu-trigger'));
    const standard = screen.getByRole('radio', { name: /Standard/ });
    expect(standard).toHaveFocus();
    fireEvent.keyDown(standard, { key: 'ArrowDown' });
    expect(screen.getByRole('radio', { name: /Majority/ })).toHaveFocus();
    expect(onMethodChange).toHaveBeenCalledWith('majority');
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('focuses the first available method when the current one is unavailable', () => {
    const estimates = { ...sampleEstimates, council: estimate(8, 0.01, 0.02, { available: false }) };
    renderWithI18n(<MethodMenu method="council" onMethodChange={() => undefined} estimates={estimates} />);
    fireEvent.click(screen.getByTestId('method-menu-trigger'));
    const standard = screen.getByRole('radio', { name: /Standard/ });
    expect(standard).toHaveFocus();
    expect(standard).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: /Council/ })).toHaveAttribute('tabindex', '-1');
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

  it('sets the top N for the Ranked method, kept between 3 and the maximum', () => {
    const onTopNChange = vi.fn();
    renderWithI18n(
      <MethodMenu
        method="elo"
        onMethodChange={() => undefined}
        estimates={sampleEstimates}
        topN={3}
        topNMax={5}
        onTopNChange={onTopNChange}
        defaultOpen
      />,
    );
    const input = screen.getByRole('spinbutton', { name: 'Best answers merged' });
    expect(input).toHaveValue(3);
    fireEvent.change(input, { target: { value: '4' } });
    expect(onTopNChange).toHaveBeenLastCalledWith(4);
    fireEvent.change(input, { target: { value: '9' } });
    expect(onTopNChange).toHaveBeenLastCalledWith(5);
    fireEvent.change(input, { target: { value: '1' } });
    expect(onTopNChange).toHaveBeenLastCalledWith(3);
  });

  it('shows the top N only for the Ranked method', () => {
    renderWithI18n(
      <MethodMenu method="standard" onMethodChange={() => undefined} estimates={sampleEstimates} onTopNChange={() => undefined} defaultOpen />,
    );
    expect(screen.queryByTestId('input-top-n')).not.toBeInTheDocument();
  });

  it('labels the top N in French', () => {
    renderWithI18n(
      <MethodMenu method="elo" onMethodChange={() => undefined} estimates={sampleEstimates} onTopNChange={() => undefined} defaultOpen />,
      { language: 'fr' },
    );
    expect(screen.getByRole('spinbutton', { name: 'Meilleures réponses fusionnées' })).toBeInTheDocument();
  });

  it('shows no counts for a method with no estimate yet', () => {
    renderWithI18n(<MethodMenu method="majority" onMethodChange={() => undefined} estimates={{}} />, { language: 'fr' });
    const trigger = screen.getByTestId('method-menu-trigger');
    expect(trigger).toHaveTextContent('Majorité');
    expect(trigger).not.toHaveTextContent('appel');
  });
});
