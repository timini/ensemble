import type { StrategyName } from '../types.js';
import { fileExists, readJsonFile, writeJsonFile } from '../lib/io.js';
import { fisherExact } from '../lib/fisherExact.js';
import { holmBonferroni } from '../lib/statistics.js';
import { wilsonScoreInterval } from '../lib/wilsonScore.js';
import { computeAccuracy } from './quickEvalHelpers.js';
import type { DatasetResult } from './quickEvalOutput.js';

interface AccuracyRecord {
  accuracy: number;
  correct: number;
  total: number;
}

export interface QuickEvalBaselineFile {
  model: string;
  ensembleSize: number;
  sample: number;
  datasets: string[];
  strategies: StrategyName[];
  updatedAt: string;
  single: AccuracyRecord;
  ensemble: Record<string, AccuracyRecord>;
}

export interface StrategyCheckResult {
  strategy: string;
  baselineAccuracy: number;
  currentAccuracy: number;
  delta: number;
  /** Delta over single (strategy_acc - single_acc) from baseline run. */
  baselineLift?: number;
  /** Delta over single (strategy_acc - single_acc) from current run. */
  currentLift?: number;
  /** Change in lift (currentLift - baselineLift). */
  liftChange?: number;
  pValue: number;
  correctedPValue: number;
  significant: boolean;
  wilsonCI: { lower: number; upper: number };
}

export interface RegressionCheckResult {
  passed: boolean;
  significanceLevel: number;
  results: StrategyCheckResult[];
}

export function buildBaselineFromResults(
  model: string,
  ensembleSize: number,
  sample: number,
  datasets: string[],
  strategies: StrategyName[],
  allDatasetResults: DatasetResult[],
): QuickEvalBaselineFile {
  const allSingleRuns = allDatasetResults.flatMap((d) => d.singleRuns);
  const allEnsembleRuns = allDatasetResults.flatMap((d) => d.ensembleRuns);

  const singleAcc = computeAccuracy(allSingleRuns);
  const ensemble: Record<string, AccuracyRecord> = {};
  for (const strategy of strategies) {
    const acc = computeAccuracy(allEnsembleRuns, strategy);
    ensemble[strategy] = { accuracy: acc.accuracy, correct: acc.correct, total: acc.total };
  }

  return {
    model,
    ensembleSize,
    sample,
    datasets,
    strategies,
    updatedAt: new Date().toISOString(),
    single: { accuracy: singleAcc.accuracy, correct: singleAcc.correct, total: singleAcc.total },
    ensemble,
  };
}

export async function loadBaseline(path: string): Promise<QuickEvalBaselineFile | null> {
  if (!(await fileExists(path))) return null;
  try {
    return await readJsonFile<QuickEvalBaselineFile>(path);
  } catch {
    return null;
  }
}

export async function saveBaseline(path: string, baseline: QuickEvalBaselineFile): Promise<void> {
  await writeJsonFile(path, baseline);
}

/**
 * Check for regressions between a previous and current baseline using
 * Fisher's exact test with Holm-Bonferroni correction.
 *
 * Uses one-sided Fisher's exact test (lower tail) to determine if current
 * accuracy is significantly worse than baseline. With small sample sizes
 * (e.g. 30 total questions), this avoids false-positive failures from
 * natural LLM non-determinism while still catching real regressions.
 *
 * @param significanceLevel - Family-wise alpha level (default 0.10).
 */
export function checkRegression(
  previous: QuickEvalBaselineFile,
  current: QuickEvalBaselineFile,
  significanceLevel = 0.10,
): RegressionCheckResult {
  // Build list of all tests: single + each ensemble strategy
  const tests: Array<{
    strategy: string;
    baseline: AccuracyRecord;
    current: AccuracyRecord;
  }> = [{ strategy: 'single', baseline: previous.single, current: current.single }];

  for (const strategy of current.strategies) {
    const prev = previous.ensemble[strategy];
    const curr = current.ensemble[strategy];
    if (prev && curr) {
      tests.push({ strategy, baseline: prev, current: curr });
    }
  }

  // Compute raw Fisher's exact p-values
  const rawPValues = tests.map((t) => {
    const baselineWrong = t.baseline.total - t.baseline.correct;
    const currentWrong = t.current.total - t.current.correct;
    const { pValue } = fisherExact(t.baseline.correct, baselineWrong, t.current.correct, currentWrong);
    return { pValue, label: t.strategy };
  });

  // Apply Holm-Bonferroni correction
  const corrected = holmBonferroni(rawPValues, significanceLevel);

  // Compute single-model accuracy for lift calculations
  const baselineSingleAcc = previous.single.total > 0 ? previous.single.correct / previous.single.total : 0;
  const currentSingleAcc = current.single.total > 0 ? current.single.correct / current.single.total : 0;

  // Build results with Wilson score CIs
  const results: StrategyCheckResult[] = tests.map((t, i) => {
    const baselineAccuracy = t.baseline.total > 0 ? t.baseline.correct / t.baseline.total : 0;
    const currentAccuracy = t.current.total > 0 ? t.current.correct / t.current.total : 0;
    const ci = wilsonScoreInterval(t.current.correct, t.current.total);
    const isStrategy = t.strategy !== 'single';
    const baselineLift = isStrategy ? baselineAccuracy - baselineSingleAcc : undefined;
    const currentLift = isStrategy ? currentAccuracy - currentSingleAcc : undefined;
    const liftChange = baselineLift !== undefined && currentLift !== undefined
      ? currentLift - baselineLift
      : undefined;
    return {
      strategy: t.strategy,
      baselineAccuracy,
      currentAccuracy,
      delta: currentAccuracy - baselineAccuracy,
      baselineLift,
      currentLift,
      liftChange,
      pValue: corrected[i].originalPValue,
      correctedPValue: corrected[i].correctedPValue,
      significant: corrected[i].significant,
      wilsonCI: { lower: ci.lower, upper: ci.upper },
    };
  });

  // Pass iff no result is both significant AND a regression (negative delta)
  const passed = results.every((r) => !r.significant || r.delta >= 0);

  return { passed, significanceLevel, results };
}

export function printRegressionReport(result: RegressionCheckResult): void {
  const w = (s: string) => process.stdout.write(s);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const signedPct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
  const pad = (s: string, len: number) => s.padEnd(len);
  const fmtP = (p: number) => (p < 0.001 ? '<0.001' : p.toFixed(3));

  w(`\n  REGRESSION ANALYSIS (alpha = ${result.significanceLevel}, Holm-Bonferroni corrected)\n\n`);
  w(`  ${pad('Strategy', 13)}${pad('Base Δ', 11)}${pad('Curr Δ', 11)}${pad('Change', 10)}${pad('p-value', 10)}Sig\n`);

  for (const r of result.results) {
    const sig = r.significant && r.delta < 0 ? '*' : '';
    if (r.baselineLift !== undefined && r.currentLift !== undefined && r.liftChange !== undefined) {
      // Ensemble strategy: show lift over single
      w(`  ${pad(r.strategy, 13)}${pad(signedPct(r.baselineLift), 11)}${pad(signedPct(r.currentLift), 11)}${pad(signedPct(r.liftChange), 10)}${pad(fmtP(r.correctedPValue), 10)}${sig}\n`);
    } else {
      // Single: show absolute accuracy
      w(`  ${pad(r.strategy, 13)}${pad(pct(r.baselineAccuracy), 11)}${pad(pct(r.currentAccuracy), 11)}${pad(signedPct(r.delta), 10)}${pad(fmtP(r.correctedPValue), 10)}${sig}\n`);
    }
  }

  w('\n  Deltas show lift over single baseline (strategy_acc - single_acc)\n');
  w('  * = significant regression after Holm-Bonferroni correction\n');
  w(`  Result: ${result.passed ? 'PASSED (no significant regressions)' : 'FAILED (significant regression detected)'}\n`);
}
