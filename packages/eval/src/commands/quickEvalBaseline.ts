import type { StrategyName } from '../types.js';
import { fileExists, readJsonFile, writeJsonFile } from '../lib/io.js';
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

export interface RegressionCheckResult {
  passed: boolean;
  regressions: Array<{
    strategy: string;
    previous: number;
    current: number;
    delta: number;
  }>;
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
 * Check for regressions between a previous and current baseline.
 *
 * @param tolerance - Accuracy drop (as a fraction, e.g. 0.10 = 10%) that is
 *   tolerated before flagging a regression.  With small sample sizes (e.g. 10
 *   questions per dataset) LLM responses are non-deterministic and a single
 *   question flip can cause a 5% swing.  The default tolerance of 10% avoids
 *   false-positive failures from natural variance.
 */
export function checkRegression(
  previous: QuickEvalBaselineFile,
  current: QuickEvalBaselineFile,
  tolerance = 0.10,
): RegressionCheckResult {
  const regressions: RegressionCheckResult['regressions'] = [];

  // Check single-model regression (only flag if drop exceeds tolerance)
  const singleDelta = current.single.accuracy - previous.single.accuracy;
  if (singleDelta < -tolerance) {
    regressions.push({
      strategy: 'single',
      previous: previous.single.accuracy,
      current: current.single.accuracy,
      delta: singleDelta,
    });
  }

  // Check each strategy
  for (const strategy of current.strategies) {
    const prev = previous.ensemble[strategy];
    const curr = current.ensemble[strategy];
    if (prev && curr) {
      const delta = curr.accuracy - prev.accuracy;
      if (delta < -tolerance) {
        regressions.push({
          strategy,
          previous: prev.accuracy,
          current: curr.accuracy,
          delta,
        });
      }
    }
  }

  return { passed: regressions.length === 0, regressions };
}

export function printRegressionReport(result: RegressionCheckResult): void {
  const w = (s: string) => process.stdout.write(s);

  if (result.passed) {
    w('\n  ✓ No regressions detected.\n');
    return;
  }

  w('\n  ✗ REGRESSIONS DETECTED:\n\n');
  for (const r of result.regressions) {
    const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
    const delta = `${((r.delta) * 100).toFixed(1)}%`;
    w(`    ${r.strategy}: ${pct(r.previous)} → ${pct(r.current)} (${delta})\n`);
  }
  w('\n');
}
