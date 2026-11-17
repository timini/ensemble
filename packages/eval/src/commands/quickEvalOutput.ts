import type { PromptRunResult, StrategyName } from '../types.js';
import {
  toPercent, toDelta, sumTokens, sumCost,
  avgDurationMs, formatMs, computeAccuracy, sumStrategyMetrics, type AccuracyCount,
} from './quickEvalHelpers.js';
import {
  comparePaired, formatInterval, formatPValue, pairSingleWithStrategy, withInterval,
} from '../lib/pairedStats.js';

export interface DatasetResult {
  dataset: string;
  singleRuns: PromptRunResult[];
  ensembleRuns: PromptRunResult[];
}

/** "62.0% (124/200) 95% CI [55.1, 68.4]", plus failures when there were any. */
function accuracyText(acc: AccuracyCount): string {
  const ci = withInterval(acc.correct, acc.total);
  const failures = acc.errors + acc.timeouts > 0
    ? `  failed: ${acc.errors} error(s), ${acc.timeouts} timeout(s) (counted wrong)`
    : '';
  return `${toPercent(acc.accuracy)} (${acc.correct}/${acc.total}) 95% CI ${formatInterval(ci)}${failures}`;
}

/** Paired McNemar test of a strategy against the single model on the same questions. */
function mcNemarText(singleRuns: PromptRunResult[], ensembleRuns: PromptRunResult[], strategy: StrategyName): string {
  const pairs = pairSingleWithStrategy(singleRuns, ensembleRuns, strategy);
  if (pairs.length === 0) return 'McNemar: no paired questions';
  const c = comparePaired(pairs);
  return `McNemar vs single: n=${c.n} single-only=${c.n10} ensemble-only=${c.n01} p=${formatPValue(c.pValue)} (${c.method})`;
}

export function printResults(
  model: string,
  ensembleSize: number,
  strategies: StrategyName[],
  allDatasetResults: DatasetResult[],
  durationMs: number,
): void {
  const w = (s: string) => process.stdout.write(s);
  const allSingleRuns = allDatasetResults.flatMap((d) => d.singleRuns);
  const allEnsembleRuns = allDatasetResults.flatMap((d) => d.ensembleRuns);
  const singleAcc = computeAccuracy(allSingleRuns);
  const singleTokens = sumTokens(allSingleRuns);
  const singleCost = sumCost(allSingleRuns);
  const singleAvgTime = avgDurationMs(allSingleRuns);

  w(`\n${'='.repeat(70)}\n`);
  w(`  QUICK EVAL RESULTS: ${model}\n`);
  w(`${'='.repeat(70)}\n\n`);

  for (const dr of allDatasetResults) {
    const dsSingle = computeAccuracy(dr.singleRuns);
    const dsSingleTokens = sumTokens(dr.singleRuns);
    const dsSingleTime = avgDurationMs(dr.singleRuns);
    w(`  ${dr.dataset}:\n`);
    w(`    Single:   ${accuracyText(dsSingle)}  tokens: ${dsSingleTokens.toLocaleString()}  avg: ${formatMs(dsSingleTime)}/q\n`);
    const dsModelToks = sumTokens(dr.ensembleRuns);
    for (const strategy of strategies) {
      const dsStrat = computeAccuracy(dr.ensembleRuns, strategy);
      const delta = dsStrat.accuracy - dsSingle.accuracy;
      const sm = sumStrategyMetrics(dr.ensembleRuns, strategy);
      const stratTokens = dsModelToks + sm.tokenCount;
      const stratTokenDelta = stratTokens - dsSingleTokens;
      w(`    ${strategy.padEnd(10)} ${accuracyText(dsStrat)}  delta: ${toDelta(delta)}  tokens: ${stratTokens.toLocaleString()} (${stratTokenDelta > 0 ? '+' : ''}${stratTokenDelta.toLocaleString()})  avg: ${formatMs(sm.durationMs)}/q\n`);
      w(`               ${mcNemarText(dr.singleRuns, dr.ensembleRuns, strategy)}\n`);
    }
    w('\n');
  }

  w(`  ${'-'.repeat(66)}\n`);
  w('  SUMMARY\n');
  w(`  ${'-'.repeat(66)}\n\n`);

  const ensembleModelCost = sumCost(allEnsembleRuns);
  const modelTokens = sumTokens(allEnsembleRuns);

  w(`  ${'Single (1x)'.padEnd(16)} ${accuracyText(singleAcc)}\n`);
  w(`  ${''.padEnd(16)} tokens: ${singleTokens.toLocaleString()}  avg: ${formatMs(singleAvgTime)}/q  cost: $${singleCost.toFixed(4)}\n`);

  for (const strategy of strategies) {
    const stratAcc = computeAccuracy(allEnsembleRuns, strategy);
    const sm = sumStrategyMetrics(allEnsembleRuns, strategy);
    const stratTokens = modelTokens + sm.tokenCount;
    // Strategy cost: the ensemble's answers plus this strategy's consensus calls.
    const stratCost = ensembleModelCost + (sm.costUsd ?? 0);
    w(`  ${`${strategy} (${ensembleSize}x)`.padEnd(16)} ${accuracyText(stratAcc)}\n`);
    w(`  ${''.padEnd(16)} tokens: ${stratTokens.toLocaleString()}  avg: ${formatMs(sm.durationMs)}/q  cost: $${stratCost.toFixed(4)}\n`);
    w(`  ${''.padEnd(16)} delta vs single: ${toDelta(stratAcc.accuracy - singleAcc.accuracy)}  ${mcNemarText(allSingleRuns, allEnsembleRuns, strategy)}\n`);
  }

  w('\n  Costs come from the shared price table; local models cost $0 and unpriced models count as $0.\n');
  w(`  Wall clock: ${Math.round(durationMs / 1000)}s\n`);
  w(`${'='.repeat(70)}\n`);
}
