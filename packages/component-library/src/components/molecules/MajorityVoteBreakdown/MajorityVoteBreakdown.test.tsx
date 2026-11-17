import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { MajorityVoteBreakdown } from './MajorityVoteBreakdown';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const winnerOptions = [
  { answer: '42', votes: 3, models: ['GPT', 'Claude', 'Gemini'] },
  { answer: '41', votes: 1, models: ['Grok'] },
];

describe('MajorityVoteBreakdown', () => {
  it('shows the winner with its vote count', () => {
    renderWithI18n(
      <MajorityVoteBreakdown outcome="winner" totalResponses={4} options={winnerOptions} />,
    );

    expect(screen.getByTestId('majority-vote-breakdown')).toHaveAttribute('data-outcome', 'winner');
    expect(screen.getByTestId('majority-vote-title')).toHaveTextContent('Majority vote');
    expect(screen.getByTestId('majority-vote-summary')).toHaveTextContent(
      '42 won with 3 of 4 votes.',
    );
  });

  it('lists every answer with its votes and the models that gave it', () => {
    renderWithI18n(
      <MajorityVoteBreakdown outcome="winner" totalResponses={4} options={winnerOptions} />,
    );

    const rows = screen.getAllByTestId('majority-vote-option');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('data-winner', 'true');
    expect(rows[1]).toHaveAttribute('data-winner', 'false');
    expect(within(rows[0]!).getByTestId('majority-vote-answer')).toHaveTextContent('42');
    expect(within(rows[0]!).getByTestId('majority-vote-count')).toHaveTextContent('3 votes');
    expect(within(rows[0]!).getByTestId('majority-vote-models')).toHaveTextContent(
      'GPT, Claude, Gemini',
    );
    expect(within(rows[1]!).getByTestId('majority-vote-count')).toHaveTextContent('1 vote');
  });

  it('marks every tied answer and says the LLM method decided', () => {
    renderWithI18n(
      <MajorityVoteBreakdown
        outcome="tie"
        totalResponses={4}
        options={[
          { answer: 'B', votes: 2, models: ['GPT', 'Grok'] },
          { answer: 'C', votes: 2, models: ['Claude', 'Gemini'] },
        ]}
      />,
    );

    expect(screen.getByTestId('majority-vote-summary')).toHaveTextContent(
      'Tie between B and C with 2 votes each. The consensus comes from the LLM majority method.',
    );
    expect(screen.getAllByTestId('majority-vote-option')).toHaveLength(2);
    expect(
      screen.getAllByTestId('majority-vote-option').every((row) => row.dataset.winner === 'false'),
    ).toBe(true);
  });

  it('explains the fallback for long-form answers and shows no tally', () => {
    renderWithI18n(
      <MajorityVoteBreakdown outcome="no-short-answers" totalResponses={3} options={[]} />,
    );

    expect(screen.getByTestId('majority-vote-summary')).toHaveTextContent(
      'The answers are not short',
    );
    expect(screen.queryByTestId('majority-vote-options')).not.toBeInTheDocument();
  });

  it('explains the fallback when extraction failed', () => {
    renderWithI18n(
      <MajorityVoteBreakdown outcome="extraction-failed" totalResponses={3} options={[]} />,
    );

    expect(screen.getByTestId('majority-vote-summary')).toHaveTextContent(
      'Short answers could not be extracted',
    );
  });

  it('lists models with no short answer', () => {
    renderWithI18n(
      <MajorityVoteBreakdown
        outcome="winner"
        totalResponses={4}
        options={[{ answer: 'Yes', votes: 2, models: ['GPT', 'Gemini'] }]}
        abstainedModels={['DeepSeek', 'Grok']}
      />,
    );

    expect(screen.getByTestId('majority-vote-abstained')).toHaveTextContent(
      'No short answer: DeepSeek, Grok',
    );
  });

  it('renders French text', () => {
    renderWithI18n(
      <MajorityVoteBreakdown outcome="winner" totalResponses={4} options={winnerOptions} />,
      { language: 'fr' },
    );

    expect(screen.getByTestId('majority-vote-title')).toHaveTextContent('Vote majoritaire');
    expect(screen.getByTestId('majority-vote-summary')).toHaveTextContent(
      '42 l’emporte avec 3 voix sur 4.',
    );
  });
});
