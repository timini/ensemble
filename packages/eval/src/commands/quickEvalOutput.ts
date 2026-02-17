import type { PromptRunResult, StrategyName } from '../types.js';
import {
  toPercent, toDelta, sumTokens, sumCost,
  avgDurationMs, formatMs, computeAccuracy,
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
    const dsEnsembleTokens = sumTokens(dr.ensembleRuns);
    const dsEnsembleTime = avgDurationMs(dr.ensembleRuns);
    for (const strategy of strategies) {
      const dsStrat = computeAccuracy(dr.ensembleRuns, strategy);
      const delta = dsStrat.accuracy - dsSingle.accuracy;
      process.stdout.write(`    ${strategy.padEnd(10)} ${toPercent(dsStrat.accuracy)} (${dsStrat.correct}/${dsStrat.total})  delta: ${toDelta(delta)}\n`);
    }
    const dsTokenDelta = dsEnsembleTokens - dsSingleTokens;
    process.stdout.write(`    ${'ensemble'.padEnd(10)} tokens: ${dsEnsembleTokens.toLocaleString()} (${dsTokenDelta > 0 ? '+' : ''}${dsTokenDelta.toLocaleString()})  avg: ${formatMs(dsEnsembleTime)}/q\n`);
    process.stdout.write('\n');
  }

  // Summary table
  process.stdout.write(`  ${'—'.repeat(66)}\n`);
  process.stdout.write(`  SUMMARY\n`);
  process.stdout.write(`  ${'—'.repeat(66)}\n\n`);

  const ensembleTokens = sumTokens(allEnsembleRuns);
  const ensembleCost = sumCost(allEnsembleRuns);
  const ensembleAvgTime = avgDurationMs(allEnsembleRuns);

  const hasCost = singleCost > 0 || ensembleCost > 0;
  const costHeader = hasCost ? ' Cost' : '';
  process.stdout.write(`  ${''.padEnd(16)} ${'Accuracy'.padEnd(22)} ${'Tokens'.padEnd(14)} ${'Avg Time'.padEnd(12)}${costHeader}\n`);

  const singleCostStr = hasCost ? ` $${singleCost.toFixed(4)}` : '';
  process.stdout.write(`  ${'Single (1x)'.padEnd(16)} ${`${toPercent(singleAcc.accuracy)} (${singleAcc.correct}/${singleAcc.total})`.padEnd(22)} ${singleTokens.toLocaleString().padEnd(14)} ${`${formatMs(singleAvgTime)}/q`.padEnd(12)}${singleCostStr}\n`);

  const ensembleCostStr = hasCost ? ` $${ensembleCost.toFixed(4)}` : '';
  for (const strategy of strategies) {
    const stratAcc = computeAccuracy(allEnsembleRuns, strategy);
    process.stdout.write(`  ${`${strategy} (${ensembleSize}x)`.padEnd(16)} ${`${toPercent(stratAcc.accuracy)} (${stratAcc.correct}/${stratAcc.total})`.padEnd(22)}\n`);
  }
  process.stdout.write(`  ${'Ensemble'.padEnd(16)} ${''.padEnd(22)} ${ensembleTokens.toLocaleString().padEnd(14)} ${`${formatMs(ensembleAvgTime)}/q`.padEnd(12)}${ensembleCostStr}\n`);

  process.stdout.write('\n');

  // Ensemble overhead (shared across all strategies — shown once)
  const tokenDelta = ensembleTokens - singleTokens;
  const tokenMultiplier = singleTokens > 0 ? ensembleTokens / singleTokens : null;
  const timeDelta = ensembleAvgTime - singleAvgTime;
  const timeMultiplier = singleAvgTime > 0 ? ensembleAvgTime / singleAvgTime : null;
  const tokenMultiplierStr = tokenMultiplier !== null ? ` (${tokenMultiplier.toFixed(1)}x)` : '';
  const timeMultiplierStr = timeMultiplier !== null ? ` (${timeMultiplier.toFixed(1)}x)` : '';

  process.stdout.write(`  Ensemble overhead (${ensembleSize}x vs single):\n`);
  process.stdout.write(`    Tokens:   ${tokenDelta > 0 ? '+' : ''}${tokenDelta.toLocaleString()}${tokenMultiplierStr}\n`);
  process.stdout.write(`    Time:     ${timeDelta > 0 ? '+' : ''}${formatMs(timeDelta)}/q${timeMultiplierStr}\n`);
  if (ensembleCost > 0 || singleCost > 0) {
    const costDelta = ensembleCost - singleCost;
    const costMultiplier = singleCost > 0 ? ensembleCost / singleCost : null;
    const costMultiplierStr = costMultiplier !== null ? ` (${costMultiplier.toFixed(1)}x)` : '';
    process.stdout.write(`    Cost:     ${costDelta >= 0 ? '+' : ''}$${costDelta.toFixed(4)}${costMultiplierStr}\n`);
  }
  process.stdout.write('\n');

  // Per-strategy accuracy deltas
  for (const strategy of strategies) {
    const stratAcc = computeAccuracy(allEnsembleRuns, strategy);
    const accDelta = stratAcc.accuracy - singleAcc.accuracy;
    const accIcon = accDelta > 0 ? ' ✓' : accDelta < 0 ? ' ✗' : '';
    process.stdout.write(`  ${strategy} vs single:  ${toDelta(accDelta)}${accIcon}\n`);
  }

  process.stdout.write(`\n  Wall clock: ${Math.round(durationMs / 1000)}s\n`);
  process.stdout.write(`${'='.repeat(70)}\n`);
}
