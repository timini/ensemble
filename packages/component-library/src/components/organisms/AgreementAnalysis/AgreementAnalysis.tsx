import * as React from 'react';
import { Card, CardContent } from '../../atoms/Card';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { cn } from '@/lib/utils';

export interface PairwiseComparison {
  model1: string;
  model2: string;
  similarity: number;
  confidence: number;
}

export interface AgreementAnalysisProps {
  /** Overall agreement percentage (0-1) */
  overallAgreement: number;
  /** Array of pairwise comparisons between models */
  pairwiseComparisons: PairwiseComparison[];
  /** Number of responses analyzed */
  responseCount: number;
  /** Number of pairwise comparisons */
  comparisonCount: number;
  /** Average confidence percentage (0-1) */
  averageConfidence: number;
}

/**
 * AgreementAnalysis organism for displaying model agreement metrics.
 *
 * Displays overall agreement, pairwise comparisons with similarity scores,
 * and statistics about the ensemble's agreement level.
 *
 * @example
 * ```tsx
 * <AgreementAnalysis
 *   overallAgreement={0.68}
 *   pairwiseComparisons={[
 *     { model1: 'GPT-4', model2: 'Claude', similarity: 0.72, confidence: 0.93 }
 *   ]}
 *   responseCount={3}
 *   comparisonCount={3}
 *   averageConfidence={0.93}
 * />
 * ```
 */
export const AgreementAnalysis = React.forwardRef<HTMLDivElement, AgreementAnalysisProps>(
  (
    { overallAgreement, pairwiseComparisons, responseCount, comparisonCount, averageConfidence },
    ref
  ) => {
    // Determine agreement level and color
    const getAgreementLevel = (agreement: number) => {
      if (agreement > 0.8) return { label: 'High Agreement', color: 'text-green-500' };
      if (agreement >= 0.5) return { label: 'Medium Agreement', color: 'text-yellow-500' };
      return { label: 'Low Agreement', color: 'text-red-500' };
    };

    const agreementLevel = getAgreementLevel(overallAgreement);

    // Format percentage
    const formatPercentage = (value: number) => Math.round(value * 100);

    // Get color for progress bar
    const getProgressColor = (similarity: number) => {
      if (similarity > 0.8) return 'bg-green-500';
      if (similarity >= 0.5) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <Card ref={ref} data-testid="agreement-analysis">
        <CardContent className="p-6">
          {/* Header with Overall Agreement */}
          <div className="flex items-center justify-between mb-6">
            <Heading level={3} size="lg">Agreement analysis</Heading>
            <div className="text-right">
              <div className={cn('text-2xl font-bold', agreementLevel.color)}>
                {formatPercentage(overallAgreement)}%
              </div>
              <Text variant="small" color="muted">Overall Agreement</Text>
              <Text variant="small" className={agreementLevel.color}>{agreementLevel.label}</Text>
            </div>
          </div>

          {/* Pairwise Comparisons */}
          <div className="mb-6">
            <Heading level={4} size="lg" className="mb-4">Pairwise Comparisons</Heading>
            <div className="space-y-3">
              {pairwiseComparisons.map((comparison, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Text as="span" variant="small">{comparison.model1}</Text>
                    <Text as="span" variant="small" className="text-gray-400">vs</Text>
                    <Text as="span" variant="small">{comparison.model2}</Text>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full', getProgressColor(comparison.similarity))}
                        style={{ width: `${formatPercentage(comparison.similarity)}%` }}
                      />
                    </div>
                    <Text as="span" variant="small" className="font-medium">
                      {formatPercentage(comparison.similarity)}%
                    </Text>
                    <Text as="span" variant="caption" color="muted">
                      Confidence: {formatPercentage(comparison.confidence)}%
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{responseCount}</div>
              <Text variant="small" color="muted">RESPONSES ANALYZED</Text>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{comparisonCount}</div>
              <Text variant="small" color="muted">COMPARISONS</Text>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {formatPercentage(averageConfidence)}%
              </div>
              <Text variant="small" color="muted">AVG CONFIDENCE</Text>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

AgreementAnalysis.displayName = 'AgreementAnalysis';
