import * as React from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

    // Determine agreement level and color
    const getAgreementLevel = (agreement: number) => {
      if (agreement > 0.8) return { label: t('organisms.agreementAnalysis.highAgreement'), color: 'text-success', level: 'high' };
      if (agreement >= 0.5) return { label: t('organisms.agreementAnalysis.mediumAgreement'), color: 'text-warning', level: 'medium' };
      return { label: t('organisms.agreementAnalysis.lowAgreement'), color: 'text-destructive', level: 'low' };
    };

    const agreementLevel = getAgreementLevel(overallAgreement);

    // Format percentage
    const formatPercentage = (value: number) => Math.round(value * 100);

    // Get color for progress bar
    const getProgressColor = (similarity: number) => {
      if (similarity > 0.8) return 'bg-success';
      if (similarity >= 0.5) return 'bg-warning';
      return 'bg-destructive';
    };

    return (
      <Card ref={ref} data-testid="agreement-analysis">
        <CardContent className="p-6">
          {/* Header with Overall Agreement */}
          <div className="flex items-center justify-between mb-6">
            <Heading level={3} size="lg">{t('organisms.agreementAnalysis.title')}</Heading>
            <div className="text-right">
              <div className={cn('text-2xl font-bold', agreementLevel.color)} data-agreement-level={agreementLevel.level}>
                {formatPercentage(overallAgreement)}%
              </div>
              <Text variant="small" color="muted">{t('organisms.agreementAnalysis.overallAgreement')}</Text>
              <Text variant="small" className={agreementLevel.color}>{agreementLevel.label}</Text>
            </div>
          </div>

          {/* Pairwise Comparisons */}
          <div className="mb-6">
            <Heading level={4} size="lg" className="mb-4">{t('organisms.agreementAnalysis.pairwiseComparisons')}</Heading>
            <div className="space-y-3">
              {pairwiseComparisons.map((comparison, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Text as="span" variant="small">{comparison.model1}</Text>
                    <Text as="span" variant="small" className="text-muted-foreground">{t('organisms.agreementAnalysis.vs')}</Text>
                    <Text as="span" variant="small">{comparison.model2}</Text>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full', getProgressColor(comparison.similarity))}
                        style={{ width: `${formatPercentage(comparison.similarity)}%` }}
                      />
                    </div>
                    <Text as="span" variant="small" className="font-medium">
                      {formatPercentage(comparison.similarity)}%
                    </Text>
                    <Text as="span" variant="caption" color="muted">
                      {t('organisms.agreementAnalysis.confidence', { percent: formatPercentage(comparison.confidence) })}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-8 text-center" data-testid="agreement-stats" role="group">
            <div>
              <div className="text-2xl font-bold text-primary">{responseCount}</div>
              <Text variant="small" color="muted">{t('organisms.agreementAnalysis.responsesAnalyzed')}</Text>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{comparisonCount}</div>
              <Text variant="small" color="muted">{t('organisms.agreementAnalysis.comparisons')}</Text>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {formatPercentage(averageConfidence)}%
              </div>
              <Text variant="small" color="muted">{t('organisms.agreementAnalysis.avgConfidence')}</Text>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

AgreementAnalysis.displayName = 'AgreementAnalysis';
