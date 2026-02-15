export interface AccuracyRow {
  label: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface ComparisonStats {
  comparedAgainst: string;
  sampleSize: number;
  mcnemar: {
    n11: number;
    n10: number;
    n01: number;
    n00: number;
    chiSquared: number;
    pValue: number;
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
