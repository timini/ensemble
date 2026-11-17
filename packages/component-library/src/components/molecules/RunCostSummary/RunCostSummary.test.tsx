import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RunCostSummary, formatUsd } from './RunCostSummary';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const council = { answers: 5, consensus: 56, consensusMin: 46, embeddings: 5, total: 66 };

describe('RunCostSummary', () => {
  describe('estimate', () => {
    it('shows the total calls with a breakdown and the cost range', () => {
      render(
        <RunCostSummary
          variant="estimate"
          calls={council}
          consensusAvailable
          lowUsd={0.12}
          highUsd={1.85}
        />,
      );

      expect(screen.getByTestId('run-cost-summary')).toBeInTheDocument();
      expect(screen.getByTestId('run-cost-calls')).toHaveTextContent('66 model calls');
      expect(screen.getByTestId('run-cost-breakdown')).toHaveTextContent(
        '5 answers, 46 to 56 consensus calls, 5 embedding calls',
      );
      expect(screen.getByTestId('run-cost-amount')).toHaveTextContent(
        'Estimated cost: $0.12 to $1.85',
      );
    });

    it('shows a single consensus count when it cannot vary', () => {
      render(
        <RunCostSummary
          variant="estimate"
          calls={{ answers: 3, consensus: 1, consensusMin: 1, embeddings: 3, total: 7 }}
          consensusAvailable
          lowUsd={0.002}
          highUsd={0.03}
        />,
      );
      expect(screen.getByTestId('run-cost-breakdown')).toHaveTextContent(
        '3 answers, 1 consensus calls, 3 embedding calls',
      );
    });

    it('warns when the consensus method cannot run', () => {
      render(
        <RunCostSummary
          variant="estimate"
          calls={{ answers: 2, consensus: 0, consensusMin: 0, embeddings: 2, total: 4 }}
          consensusAvailable={false}
          lowUsd={0.001}
          highUsd={0.01}
        />,
      );
      expect(screen.getByTestId('run-cost-consensus-unavailable')).toBeInTheDocument();
    });

    it('lists models with no price', () => {
      render(
        <RunCostSummary
          variant="estimate"
          calls={council}
          consensusAvailable
          lowUsd={0}
          highUsd={0}
          unpricedModels={['xai/grok-x', 'perplexity/perplexity-fast']}
        />,
      );
      expect(screen.getByTestId('run-cost-unpriced')).toHaveTextContent(
        'xai/grok-x, perplexity/perplexity-fast',
      );
    });

    it('shows the price table date when given', () => {
      render(
        <RunCostSummary
          variant="estimate"
          calls={council}
          consensusAvailable
          lowUsd={0.1}
          highUsd={1}
          priceDate="2026-11-16"
        />,
      );
      expect(screen.getByTestId('run-cost-price-source')).toHaveTextContent('2026-11-16');
    });
  });

  describe('actual', () => {
    it('shows the cost of the run from reported tokens', () => {
      render(<RunCostSummary variant="actual" callCount={7} totalUsd={0.0123} estimated={false} />);
      expect(screen.getByTestId('run-cost-calls')).toHaveTextContent('7 model calls');
      expect(screen.getByTestId('run-cost-amount')).toHaveTextContent('Cost: $0.012');
      expect(screen.queryByTestId('run-cost-estimated-note')).not.toBeInTheDocument();
    });

    it('labels the cost as estimated when some token counts were not reported', () => {
      render(<RunCostSummary variant="actual" callCount={7} totalUsd={0.0123} estimated />);
      expect(screen.getByTestId('run-cost-amount')).toHaveTextContent('Estimated cost: $0.012');
      expect(screen.getByTestId('run-cost-estimated-note')).toBeInTheDocument();
    });
  });

  describe('formatUsd', () => {
    it('keeps two significant digits below one dollar and cents above', () => {
      expect(formatUsd(0.0123, 'en')).toBe('$0.012');
      expect(formatUsd(0.12, 'en')).toBe('$0.12');
      expect(formatUsd(1.856, 'en')).toBe('$1.86');
      expect(formatUsd(0, 'en')).toBe('$0.00');
    });
  });

  describe('internationalization', () => {
    it('renders French text', () => {
      renderWithI18n(
        <RunCostSummary variant="actual" callCount={7} totalUsd={0.5} estimated />,
        { language: 'fr' },
      );
      expect(screen.getByTestId('run-cost-calls')).toHaveTextContent('7 appels de modèles');
      expect(screen.getByTestId('run-cost-amount')).toHaveTextContent('Coût estimé');
    });
  });
});
