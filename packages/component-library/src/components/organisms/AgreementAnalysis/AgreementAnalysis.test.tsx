import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgreementAnalysis } from './AgreementAnalysis';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const mockComparisons = [
  {
    model1: 'Claude 3 Haiku',
    model2: 'Claude 3 Opus',
    similarity: 0.56,
    confidence: 0.95,
  },
];

describe('AgreementAnalysis', () => {
  describe('rendering', () => {
    it('renders overall agreement percentage', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      // Query for all 56% elements (appears in header and pairwise comparison)
      const percentages = screen.getAllByText('56%');
      expect(percentages.length).toBeGreaterThan(0);
    });

    it('renders overall agreement label', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('Overall Agreement')).toBeInTheDocument();
    });

    it('renders agreement analysis title', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('Agreement analysis')).toBeInTheDocument();
    });

    it('renders pairwise comparisons section', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('Pairwise Comparisons')).toBeInTheDocument();
    });
  });

  describe('agreement level classification', () => {
    it('shows low agreement for < 0.5', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.35}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('Low Agreement')).toBeInTheDocument();
    });

    it('shows medium agreement for 0.5-0.8', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.68}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('Medium Agreement')).toBeInTheDocument();
    });

    it('shows high agreement for > 0.8', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.89}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('High Agreement')).toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('applies red color for low agreement', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.35}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      const percentage = screen.getByText('35%');
      expect(percentage).toHaveAttribute('data-agreement-level', 'low');
    });

    it('applies warning level for medium agreement', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.68}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      const percentage = screen.getByText('68%');
      expect(percentage).toHaveAttribute('data-agreement-level', 'medium');
    });

    it('applies success level for high agreement', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.89}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      const percentage = screen.getByText('89%');
      expect(percentage).toHaveAttribute('data-agreement-level', 'high');
    });
  });

  describe('pairwise comparisons', () => {
    it('renders model names in comparisons', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('Claude 3 Haiku')).toBeInTheDocument();
      expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument();
      expect(screen.getByText('vs')).toBeInTheDocument();
    });

    it('renders similarity percentages', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      // Look for similarity percentage in pairwise comparisons section
      const percentages = screen.getAllByText('56%');
      expect(percentages.length).toBeGreaterThan(0);
    });

    it('renders confidence levels', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText(/Confidence: 95%/)).toBeInTheDocument();
    });

    it('renders multiple comparisons', () => {
      const multipleComparisons = [
        { model1: 'GPT-4', model2: 'Claude 3 Opus', similarity: 0.72, confidence: 0.93 },
        { model1: 'GPT-4', model2: 'Gemini Pro', similarity: 0.65, confidence: 0.91 },
      ];

      render(
        <AgreementAnalysis
          overallAgreement={0.68}
          pairwiseComparisons={multipleComparisons}
          responseCount={3}
          comparisonCount={2}
          averageConfidence={0.92}
        />
      );

      // GPT-4 appears multiple times, so use getAllByText
      const gpt4Elements = screen.getAllByText('GPT-4');
      expect(gpt4Elements.length).toBe(2);
      expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument();
      expect(screen.getByText('Gemini Pro')).toBeInTheDocument();
    });
  });

  describe('statistics', () => {
    it('renders response count', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('RESPONSES ANALYZED')).toBeInTheDocument();
    });

    it('renders comparison count', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('COMPARISONS')).toBeInTheDocument();
    });

    it('renders average confidence', () => {
      const { container } = render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      // Find the stats grid and check for avg confidence within it
      const statsGrid = container.querySelector('[data-testid="agreement-stats"]');
      expect(statsGrid).toBeInTheDocument();
      expect(screen.getByText('AVG CONFIDENCE')).toBeInTheDocument();
    });

    it('renders statistics in grid layout', () => {
      const { container } = render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      const statsGrid = container.querySelector('[data-testid="agreement-stats"]');
      expect(statsGrid).toBeInTheDocument();
    });
  });

  describe('progress bars', () => {
    it('renders progress bar for each comparison', () => {
      const { container } = render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      const progressBars = container.querySelectorAll('.bg-muted.rounded-full');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('sets correct width for progress bar', () => {
      const { container } = render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('uses Card component', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      // Card has data-testid attribute
      const card = screen.getByTestId('agreement-analysis');
      expect(card).toBeInTheDocument();
    });

    it('has proper spacing between sections', () => {
      const { container } = render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      const sections = container.querySelectorAll('.mb-6');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('uses semantic HTML', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.56}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      // Check for headings
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles perfect agreement (1.0)', () => {
      const { container } = render(
        <AgreementAnalysis
          overallAgreement={1.0}
          pairwiseComparisons={[
            { model1: 'GPT-4', model2: 'Claude', similarity: 1.0, confidence: 0.99 },
          ]}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.99}
        />
      );

      // Check for 100% in the header
      const headerPercentage = container.querySelector('[data-agreement-level]');
      expect(headerPercentage).toHaveTextContent('100%');
      expect(screen.getByText('High Agreement')).toBeInTheDocument();
    });

    it('handles no agreement (0.0)', () => {
      const { container } = render(
        <AgreementAnalysis
          overallAgreement={0.0}
          pairwiseComparisons={[
            { model1: 'GPT-4', model2: 'Claude', similarity: 0.0, confidence: 0.85 },
          ]}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.85}
        />
      );

      // Check for 0% in the header
      const headerPercentage = container.querySelector('[data-agreement-level]');
      expect(headerPercentage).toHaveTextContent('0%');
      expect(screen.getByText('Low Agreement')).toBeInTheDocument();
    });

    it('handles boundary case at 0.5', () => {
      const { container } = render(
        <AgreementAnalysis
          overallAgreement={0.5}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      // Check for 50% in the header
      const headerPercentage = container.querySelector('[data-agreement-level]');
      expect(headerPercentage).toHaveTextContent('50%');
      expect(screen.getByText('Medium Agreement')).toBeInTheDocument();
    });

    it('handles boundary case at 0.8', () => {
      render(
        <AgreementAnalysis
          overallAgreement={0.8}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />
      );

      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('Medium Agreement')).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English text', () => {
      renderWithI18n(
        <AgreementAnalysis
          overallAgreement={0.68}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />,
        { language: 'en' }
      );
      expect(screen.getByText('Agreement analysis')).toBeInTheDocument();
      expect(screen.getByText('Overall Agreement')).toBeInTheDocument();
      expect(screen.getByText('Medium Agreement')).toBeInTheDocument();
      expect(screen.getByText('Pairwise Comparisons')).toBeInTheDocument();
      expect(screen.getByText('vs')).toBeInTheDocument();
      expect(screen.getByText('RESPONSES ANALYZED')).toBeInTheDocument();
      expect(screen.getByText('COMPARISONS')).toBeInTheDocument();
      expect(screen.getByText('AVG CONFIDENCE')).toBeInTheDocument();
    });

    it('renders French text', () => {
      renderWithI18n(
        <AgreementAnalysis
          overallAgreement={0.68}
          pairwiseComparisons={mockComparisons}
          responseCount={2}
          comparisonCount={1}
          averageConfidence={0.95}
        />,
        { language: 'fr' }
      );
      expect(screen.getByText('Analyse de concordance')).toBeInTheDocument();
      expect(screen.getByText('Concordance Globale')).toBeInTheDocument();
      expect(screen.getByText('Concordance Moyenne')).toBeInTheDocument();
      expect(screen.getByText('Comparaisons par Paires')).toBeInTheDocument();
      expect(screen.getByText('vs')).toBeInTheDocument();
      expect(screen.getByText('RÉPONSES ANALYSÉES')).toBeInTheDocument();
      expect(screen.getByText('COMPARAISONS')).toBeInTheDocument();
      expect(screen.getByText('CONFIANCE MOYENNE')).toBeInTheDocument();
    });
  });
});
