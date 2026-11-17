export interface AccuracyRow {
  label: string;
  correct: number;
  /** All answers, including failed and timed-out ones, which count as wrong. */
  total: number;
  accuracy: number;
  /** 95% Wilson interval. */
  lower: number;
  upper: number;
  errors: number;
  timeouts: number;
}

export interface ComparisonStats {
  /** The ensemble strategy compared. */
  strategy: string;
  comparedAgainst: string;
  sampleSize: number;
  mcnemar: {
    n11: number;
    n10: number;
    n01: number;
    n00: number;
    chiSquared: number;
    /** Exact binomial p below 25 discordant pairs, chi-squared with continuity correction above. */
    pValue: number;
    method: 'exact' | 'chi-squared';
  };
  bootstrap: {
    meanDelta: number;
    ciLow: number;
    ciHigh: number;
    iterations: number;
  };
}

export interface AgreementCalibrationRow {
  level: string;
  ratio: number;
  correct: number;
  total: number;
  accuracy: number;
}

export interface BreakdownRow {
  key: string;
  sampleSize: number;
  bestModelAccuracy: number;
  ensembleAccuracy: number;
  lift: number;
}

export interface NotableExample {
  questionId: string;
  prompt: string;
  groundTruth: string;
  strategy: string;
  ensembleAnswer: string;
  modelAccuracies: Record<string, boolean>;
}

export interface CostRow {
  label: string;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  averageCostPerQuestionUsd: number;
}

export interface ChartBundle {
  accuracyLiftByDifficulty: Array<{ difficulty: string; lift: number; sampleSize: number }>;
  agreementCalibration: Array<{ ratio: number; accuracy: number; total: number; level: string }>;
  modelDiversityHeatmap: {
    models: string[];
    matrix: number[][];
  };
  costVsAccuracyFrontier: Array<{
    label: string;
    type: 'model' | 'strategy';
    accuracy: number;
    totalEstimatedCostUsd: number;
  }>;
  rightAnswerAlwaysThere: {
    totalQuestions: number;
    alwaysThereCount: number;
    recoveredByEnsembleCount: number;
    missedDespiteAvailabilityCount: number;
    ensembleSolvedWhenAllFailedCount: number;
  };
}

export interface AnalysisSummary {
  promptCount: number;
  /** Answer protocol of the runs: `structured`, `legacy` or `mixed`. */
  answerProtocol: 'structured' | 'legacy' | 'mixed';
  modelAccuracy: AccuracyRow[];
  strategyAccuracy: AccuracyRow[];
  comparisons: ComparisonStats[];
  agreementCalibration: AgreementCalibrationRow[];
  categoryBreakdown: BreakdownRow[];
  difficultyBreakdown: BreakdownRow[];
  notableExamples: NotableExample[];
  costAnalysis: CostRow[];
  charts: ChartBundle;
  primaryStrategy: string | null;
}
