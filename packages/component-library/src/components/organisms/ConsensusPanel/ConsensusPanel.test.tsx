import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { ConsensusPanel } from './ConsensusPanel';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';
import { samplePairs } from '../../molecules/AgreementSummary/fixtures';

const cost = { variant: 'actual' as const, callCount: 7, totalUsd: 0.011, estimated: false, pricedCallCount: 7, unpricedCallCount: 0 };

describe('ConsensusPanel', () => {
  it('shows the agreement and the consensus answer together', () => {
    renderWithI18n(
      <ConsensusPanel
        agreement={{ status: 'ready', score: 0.86, pairs: samplePairs, calibration: { calibrated: false, embeddingModel: 'nomic-embed-text' } }}
        consensus={{ status: 'success', text: 'About 70 °C.', method: 'standard', summarizerName: 'Claude Opus 5.5', cost }}
      />,
    );
    const panel = screen.getByTestId('consensus-panel');
    expect(panel).toHaveAttribute('data-level', 'high');
    expect(screen.getByRole('img', { name: 'Agreement score 86 out of 100' })).toBeInTheDocument();
    expect(screen.getByTestId('agreement-calibration')).toHaveTextContent('Uncalibrated');
    expect(screen.getByTestId('consensus-answer-footer')).toHaveTextContent('7 model calls · Cost: $0.011');
  });

  it('shows the majority vote breakdown for the majority method', () => {
    renderWithI18n(
      <ConsensusPanel
        agreement={{ status: 'ready', score: 0.4, pairs: [] }}
        consensus={{
          status: 'success',
          text: '42',
          method: 'majority',
          majorityVote: { outcome: 'tie', totalResponses: 2, options: [{ answer: '42', votes: 1, models: ['A'] }, { answer: '41', votes: 1, models: ['B'] }] },
        }}
      />,
    );
    expect(screen.getByTestId('consensus-panel')).toHaveAttribute('data-level', 'low');
    expect(screen.getByTestId('majority-vote-breakdown')).toHaveAttribute('data-outcome', 'tie');
  });

  it('has no level while answers arrive', () => {
    renderWithI18n(
      <ConsensusPanel agreement={{ status: 'pending', progress: { done: 1, total: 3 } }} consensus={{ status: 'awaiting', method: 'standard' }} />,
      { language: 'fr' },
    );
    expect(screen.getByTestId('consensus-panel')).not.toHaveAttribute('data-level');
    expect(screen.getByTestId('agreement-pending')).toHaveTextContent('1 réponses sur 3');
  });
});
