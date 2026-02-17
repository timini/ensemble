import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsensusPresetSelector } from './ConsensusPresetSelector';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ConsensusPresetSelector', () => {
  it('renders consensus method options', () => {
    render(
      <ConsensusPresetSelector
        selectedModelCount={4}
        consensusMethod="standard"
        onConsensusMethodChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('preset-standard')).toBeInTheDocument();
    expect(screen.getByTestId('preset-elo')).toBeInTheDocument();
    expect(screen.getByTestId('preset-majority')).toBeInTheDocument();
    expect(screen.getByTestId('preset-council')).toBeInTheDocument();
  });

  it('uses Heading atom for preset heading', () => {
    render(
      <ConsensusPresetSelector
        selectedModelCount={4}
        consensusMethod="standard"
        onConsensusMethodChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Consensus Preset', level: 4 })
    ).toBeInTheDocument();
  });

  it('calls method change handler when selecting majority', async () => {
    const user = userEvent.setup();
    const onConsensusMethodChange = vi.fn();

    render(
      <ConsensusPresetSelector
        selectedModelCount={4}
        consensusMethod="standard"
        onConsensusMethodChange={onConsensusMethodChange}
      />
    );

    await user.click(screen.getByTestId('preset-majority'));

    expect(onConsensusMethodChange).toHaveBeenCalledWith('majority');
  });

  it('calls method change handler when selecting council', async () => {
    const user = userEvent.setup();
    const onConsensusMethodChange = vi.fn();

    render(
      <ConsensusPresetSelector
        selectedModelCount={4}
        consensusMethod="standard"
        onConsensusMethodChange={onConsensusMethodChange}
      />
    );

    await user.click(screen.getByTestId('preset-council'));

    expect(onConsensusMethodChange).toHaveBeenCalledWith('council');
  });

  it('disables ELO and Council options and shows warning when fewer than 3 models are selected', () => {
    render(
      <ConsensusPresetSelector
        selectedModelCount={2}
        consensusMethod="standard"
        onConsensusMethodChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('preset-elo')).toBeDisabled();
    expect(screen.getByTestId('preset-council')).toBeDisabled();
    expect(screen.getByTestId('preset-min-models-warning')).toBeInTheDocument();
  });

  it('shows Top N input only when ELO is selected and callback is provided', () => {
    const { rerender } = render(
      <ConsensusPresetSelector
        selectedModelCount={4}
        consensusMethod="standard"
        onConsensusMethodChange={vi.fn()}
        onTopNChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('input-top-n')).not.toBeInTheDocument();

    rerender(
      <ConsensusPresetSelector
        selectedModelCount={4}
        consensusMethod="elo"
        onConsensusMethodChange={vi.fn()}
        onTopNChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('input-top-n')).toBeInTheDocument();
  });

  it('uses default Top N value when topN prop is omitted', () => {
    render(
      <ConsensusPresetSelector
        selectedModelCount={4}
        consensusMethod="elo"
        onConsensusMethodChange={vi.fn()}
        onTopNChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('input-top-n')).toHaveValue(3);
  });

  it('calls Top N change handler with parsed numeric value', async () => {
    const onTopNChange = vi.fn();

    render(
      <ConsensusPresetSelector
        selectedModelCount={5}
        consensusMethod="elo"
        topN={3}
        onConsensusMethodChange={vi.fn()}
        onTopNChange={onTopNChange}
      />
    );

    const topNInput = screen.getByTestId('input-top-n');
    fireEvent.change(topNInput, { target: { value: '4' } });

    expect(onTopNChange).toHaveBeenLastCalledWith(4);
  });

  it('renders translated content in French', () => {
    renderWithI18n(
      <ConsensusPresetSelector
        selectedModelCount={4}
        consensusMethod="standard"
        onConsensusMethodChange={vi.fn()}
      />,
      { language: 'fr' }
    );

    expect(
      screen.getByRole('heading', { name: 'Préréglage de Consensus', level: 4 })
    ).toBeInTheDocument();
    expect(screen.getByText('Vote Majoritaire')).toBeInTheDocument();
    expect(screen.getByText('Débat du Conseil')).toBeInTheDocument();
  });
});
