import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { ConsensusAnswer } from './ConsensusAnswer';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const cost = { variant: 'actual' as const, callCount: 7, totalUsd: 0.011, estimated: false, pricedCallCount: 7, unpricedCallCount: 0 };

describe('ConsensusAnswer', () => {
  it('shows the answer with its method and summarizer', () => {
    renderWithI18n(<ConsensusAnswer status="success" text="About **70 °C**." method="standard" summarizerName="Claude Opus 5.5" />);
    expect(screen.getByRole('heading', { name: 'Consensus answer' })).toBeInTheDocument();
    expect(screen.getByTestId('consensus-answer')).toHaveAttribute('data-status', 'success');
    expect(screen.getByTestId('consensus-answer-by')).toHaveTextContent('Standard, merged by Claude Opus 5.5');
    expect(screen.getByText('70 °C').tagName).toBe('STRONG');
  });

  it('shows the cost and time of the run in the footer', () => {
    renderWithI18n(<ConsensusAnswer status="success" text="x" method="standard" cost={cost} durationMs={6200} />);
    const footer = screen.getByTestId('consensus-answer-footer');
    expect(footer).toHaveTextContent('7 model calls · Cost: $0.011');
    expect(footer).toHaveTextContent('6.2 s');
  });

  it('shows the majority vote breakdown', () => {
    renderWithI18n(
      <ConsensusAnswer
        status="success"
        text="42"
        method="majority"
        majorityVote={{ outcome: 'winner', totalResponses: 3, options: [{ answer: '42', votes: 2, models: ['A', 'B'] }, { answer: '41', votes: 1, models: ['C'] }] }}
      />,
    );
    expect(screen.getByTestId('majority-vote-breakdown')).toHaveAttribute('data-outcome', 'winner');
    expect(screen.getByTestId('consensus-answer-by')).toHaveTextContent('Majority');
  });

  it('copies the answer and shares it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onShare = vi.fn();
    renderWithI18n(<ConsensusAnswer status="success" text="Answer" method="standard" onShare={onShare} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('consensus-answer-copy'));
    });
    expect(writeText).toHaveBeenCalledWith('Answer');
    expect(screen.getByTestId('consensus-answer-copy')).toHaveTextContent('Copied');
    fireEvent.click(screen.getByTestId('consensus-answer-share'));
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('hides share without a handler', () => {
    renderWithI18n(<ConsensusAnswer status="success" text="x" method="standard" />);
    expect(screen.queryByTestId('consensus-answer-share')).not.toBeInTheDocument();
  });

  it.each([
    ['awaiting', 'The consensus is written when the answers are in.'],
    ['generating', 'Writing the consensus'],
    ['unavailable', 'needs at least 3 answers'],
  ] as const)('explains the %s state', (status, text) => {
    renderWithI18n(<ConsensusAnswer status={status} method="council" />);
    expect(screen.getByTestId('consensus-answer-state')).toHaveTextContent(text);
    expect(screen.queryByTestId('consensus-answer-copy')).not.toBeInTheDocument();
  });

  it('shows a failure with the error and a retry', () => {
    const onRetry = vi.fn();
    renderWithI18n(<ConsensusAnswer status="failed" method="standard" error="500 from provider" onRetry={onRetry} />, { language: 'fr' });
    expect(screen.getByTestId('consensus-answer-state')).toHaveTextContent("Le consensus n'a pas pu être rédigé.");
    expect(screen.getByTestId('consensus-answer-state')).toHaveTextContent('500 from provider');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
