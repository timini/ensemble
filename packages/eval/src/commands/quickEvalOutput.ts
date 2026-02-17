import type { PromptRunResult, StrategyName } from '../types.js';
import {
  toPercent, toDelta, sumTokens, sumCost,
  avgDurationMs, formatMs, computeAccuracy, sumStrategyMetrics,
} from './quickEvalHelpers.js';

export interface DatasetResult {
  dataset: string;
  singleRuns: PromptRunResult[];
  ensembleRuns: PromptRunResult[];
}

export function printResults(
  model: string,
  ensembleSize: number,
  strategies: StrategyName[],
  allDatasetResults: DatasetResult[],
  durationMs: number,
): void {
  const allSingleRuns = allDatasetResults.flatMap((d) => d.singleRuns);
  const allEnsembleRuns = allDatasetResults.flatMap((d) => d.ensembleRuns);
  const singleAcc = computeAccuracy(allSingleRuns);
  const singleTokens = sumTokens(allSingleRuns);
  const singleCost = sumCost(allSingleRuns);
  const singleAvgTime = avgDurationMs(allSingleRuns);

  process.stdout.write(`\n${'='.repeat(70)}\n`);
  process.stdout.write(`  QUICK EVAL RESULTS — ${model}\n`);
  process.stdout.write(`${'='.repeat(70)}\n\n`);

  // Per-dataset breakdown
  for (const dr of allDatasetResults) {
    const dsSingle = computeAccuracy(dr.singleRuns);
    const dsSingleTokens = sumTokens(dr.singleRuns);
    const dsSingleTime = avgDurationMs(dr.singleRuns);
    process.stdout.write(`  ${dr.dataset}:\n`);
    process.stdout.write(`    Single:   ${toPercent(dsSingle.accuracy)} (${dsSingle.correct}/${dsSingle.total})  tokens: ${dsSingleTokens.toLocaleString()}  avg: ${formatMs(dsSingleTime)}/q\n`);
    const dsModelToks = sumTokens(dr.ensembleRuns);
    for (const strategy of strategies) {
      const dsStrat = computeAccuracy(dr.ensembleRuns, strategy);
      const delta = dsStrat.accuracy - dsSingle.accuracy;
      const sm = sumStrategyMetrics(dr.ensembleRuns, strategy);
      const stratTokens = dsModelToks + sm.tokenCount;
      const stratTokenDelta = stratTokens - dsSingleTokens;
      process.stdout.write(`    ${strategy.padEnd(10)} ${toPercent(dsStrat.accuracy)} (${dsStrat.correct}/${dsStrat.total})  delta: ${toDelta(delta)}  tokens: ${stratTokens.toLocaleString()} (${stratTokenDelta > 0 ? '+' : ''}${stratTokenDelta.toLocaleString()})  avg: ${formatMs(sm.durationMs)}/q\n`);
    }
    process.stdout.write('\n');
  }

  // Summary table
  process.stdout.write(`  ${'—'.repeat(66)}\n`);
  process.stdout.write(`  SUMMARY\n`);
  process.stdout.write(`  ${'—'.repeat(66)}\n\n`);

  const ensembleCost = sumCost(allEnsembleRuns);
  const modelTokens = sumTokens(allEnsembleRuns);

  const hasCost = singleCost > 0 || ensembleCost > 0;
  const costHeader = hasCost ? ' Cost' : '';
  process.stdout.write(`  ${''.padEnd(16)} ${'Accuracy'.padEnd(22)} ${'Tokens'.padEnd(14)} ${'Avg Time'.padEnd(12)}${costHeader}\n`);

  const singleCostStr = hasCost ? ` $${singleCost.toFixed(4)}` : '';
  process.stdout.write(`  ${'Single (1x)'.padEnd(16)} ${`${toPercent(singleAcc.accuracy)} (${singleAcc.correct}/${singleAcc.total})`.padEnd(22)} ${singleTokens.toLocaleString().padEnd(14)} ${`${formatMs(singleAvgTime)}/q`.padEnd(12)}${singleCostStr}\n`);

  const ensembleCostStr = hasCost ? ` $${ensembleCost.toFixed(4)}` : '';
  for (const strategy of strategies) {
    const stratAcc = computeAccuracy(allEnsembleRuns, strategy);
    const sm = sumStrategyMetrics(allEnsembleRuns, strategy);
    const stratTokens = modelTokens + sm.tokenCount;
    process.stdout.write(`  ${`${strategy} (${ensembleSize}x)`.padEnd(16)} ${`${toPercent(stratAcc.accuracy)} (${stratAcc.correct}/${stratAcc.total})`.padEnd(22)} ${stratTokens.toLocaleString().padEnd(14)} ${`${formatMs(sm.durationMs)}/q`.padEnd(12)}${ensembleCostStr}\n`);
  }

  process.stdout.write('\n');

  // Per-strategy overhead vs single
  for (const strategy of strategies) {
    const stratAcc = computeAccuracy(allEnsembleRuns, strategy);
    const accDelta = stratAcc.accuracy - singleAcc.accuracy;
    const accIcon = accDelta > 0 ? ' ✓' : accDelta < 0 ? ' ✗' : '';
    const sm = sumStrategyMetrics(allEnsembleRuns, strategy);
    const stratTokens = modelTokens + sm.tokenCount;
    const tokenDelta = stratTokens - singleTokens;
    const tokenMult = singleTokens > 0 ? stratTokens / singleTokens : null;
    const tokenMultStr = tokenMult !== null ? ` (${tokenMult.toFixed(1)}x)` : '';
    process.stdout.write(`  ${strategy} vs single:  ${toDelta(accDelta)}${accIcon}  tokens: ${tokenDelta > 0 ? '+' : ''}${tokenDelta.toLocaleString()}${tokenMultStr}\n`);
  }

  process.stdout.write(`\n  Wall clock: ${Math.round(durationMs / 1000)}s\n`);
  process.stdout.write(`${'='.repeat(70)}\n`);
}
