import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../atoms/Badge';
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
  /**
   * Cut-offs for the high and medium labels on the 0-1 scale shown. Above
   * `high` is high, from `medium` is medium. Defaults to the uncalibrated
   * mapping (0.8 and 0.5).
   */
  levelThresholds?: AgreementLevelThresholds;
  /** Whether the thresholds were fitted for this embedding model. Shown as a note when set. */
  calibration?: AgreementCalibrationInfo;
}

export interface AgreementLevelThresholds {
  high: number;
  medium: number;
}

export interface AgreementCalibrationInfo {
  calibrated: boolean;
  /** Embedding model key the calibration was fitted for (`openai/text-embedding-3-small`). */
  embeddingModel?: string;
}

/** The uncalibrated mapping: (cosine + 1) / 2 above 0.8 is high, from 0.5 medium. */
export const DEFAULT_LEVEL_THRESHOLDS: AgreementLevelThresholds = { high: 0.8, medium: 0.5 };

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
    {
      overallAgreement,
      pairwiseComparisons,
      responseCount,
      comparisonCount,
      averageConfidence,
      levelThresholds = DEFAULT_LEVEL_THRESHOLDS,
      calibration,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const { high, medium } = levelThresholds;

    // Determine agreement level and color
    const getAgreementLevel = (agreement: number) => {
      if (agreement > high) return { label: t('organisms.agreementAnalysis.highAgreement'), color: 'text-success', level: 'high' };
      if (agreement >= medium) return { label: t('organisms.agreementAnalysis.mediumAgreement'), color: 'text-warning', level: 'medium' };
      return { label: t('organisms.agreementAnalysis.lowAgreement'), color: 'text-destructive', level: 'low' };
    };

    const agreementLevel = getAgreementLevel(overallAgreement);

    const formatPercentage = (value: number) => Math.round(value * 100);

    const getProgressColor = (similarity: number) => {
      if (similarity > high) return 'bg-success';
      if (similarity >= medium) return 'bg-warning';
      return 'bg-destructive';
    };

    return (
      <Card ref={ref} data-testid="agreement-analysis">
        <CardContent className="p-6">
          {/* Header with Overall Agreement */}
          <div className="flex items-center justify-between mb-6">
            <Heading level={3} size="lg">{t('organisms.agreementAnalysis.title')}</Heading>
            <div className="text-right">
              <div
                className={cn('text-2xl font-bold', agreementLevel.color)}
                data-agreement-level={agreementLevel.level}
                data-testid="agreement-overall"
              >
                {formatPercentage(overallAgreement)}%
              </div>
              <Text variant="small" color="muted">{t('organisms.agreementAnalysis.overallAgreement')}</Text>
              <Text variant="small" className={agreementLevel.color}>{agreementLevel.label}</Text>
            </div>
          </div>
          {calibration && <CalibrationNote {...calibration} />}

          {/* Pairwise Comparisons */}
          <div className="mb-6">
            <Heading level={4} size="lg" className="mb-4">{t('organisms.agreementAnalysis.pairwiseComparisons')}</Heading>
            <div className="space-y-3" data-testid="pairwise-comparisons">
              {pairwiseComparisons.map((comparison, index) => (
                <div key={index} className="flex items-center justify-between" data-testid="pairwise-comparison">
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
                    <Text as="span" variant="small" className="font-medium" data-testid="pairwise-similarity">
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
              <div className="text-2xl font-bold text-primary" data-testid="agreement-response-count">{responseCount}</div>
              <Text variant="small" color="muted">{t('organisms.agreementAnalysis.responsesAnalyzed')}</Text>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary" data-testid="agreement-comparison-count">{comparisonCount}</div>
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

/** Says whether the labels are calibrated for the embedding model in use. */
function CalibrationNote({ calibrated, embeddingModel }: AgreementCalibrationInfo) {
  const { t } = useTranslation();
  return (
    <div
      className="-mt-2 mb-6 flex flex-wrap items-center gap-2"
      data-testid="agreement-calibration"
      data-calibrated={calibrated ? 'true' : 'false'}
    >
      {calibrated ? (
        <Text variant="caption" color="muted">
          {t('organisms.agreementAnalysis.calibrated', { model: embeddingModel ?? '' })}
        </Text>
      ) : (
        <>
          <Badge variant="outline">{t('organisms.agreementAnalysis.uncalibrated')}</Badge>
          <Text variant="caption" color="muted">{t('organisms.agreementAnalysis.uncalibratedHint')}</Text>
        </>
      )}
    </div>
  );
}
