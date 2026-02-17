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
    for (const strategy of strategies) {
      const dsStrat = computeAccuracy(dr.ensembleRuns, strategy);
      const dsTokens = sumTokens(dr.ensembleRuns);
      const dsTime = avgDurationMs(dr.ensembleRuns);
      const delta = dsStrat.accuracy - dsSingle.accuracy;
      const tokenDelta = dsTokens - dsSingleTokens;
      process.stdout.write(`    ${strategy.padEnd(10)} ${toPercent(dsStrat.accuracy)} (${dsStrat.correct}/${dsStrat.total})  delta: ${toDelta(delta)}  tokens: ${dsTokens.toLocaleString()} (${tokenDelta > 0 ? '+' : ''}${tokenDelta.toLocaleString()})  avg: ${formatMs(dsTime)}/q\n`);
    }
    process.stdout.write('\n');
  }

  // Summary table
  process.stdout.write(`  ${'—'.repeat(66)}\n`);
  process.stdout.write(`  SUMMARY\n`);
  process.stdout.write(`  ${'—'.repeat(66)}\n\n`);

  const ensembleTokens = sumTokens(allEnsembleRuns);
  const ensembleCost = sumCost(allEnsembleRuns);
  const ensembleAvgTime = avgDurationMs(allEnsembleRuns);

  process.stdout.write(`  ${''.padEnd(14)} ${'Accuracy'.padEnd(22)} ${'Tokens'.padEnd(14)} ${'Avg Time'.padEnd(12)} Cost\n`);
  process.stdout.write(`  ${'Single (1x)'.padEnd(14)} ${`${toPercent(singleAcc.accuracy)} (${singleAcc.correct}/${singleAcc.total})`.padEnd(22)} ${singleTokens.toLocaleString().padEnd(14)} ${`${formatMs(singleAvgTime)}/q`.padEnd(12)} $${singleCost.toFixed(4)}\n`);

  for (const strategy of strategies) {
    const stratAcc = computeAccuracy(allEnsembleRuns, strategy);
    process.stdout.write(`  ${`${strategy} (${ensembleSize}x)`.padEnd(14)} ${`${toPercent(stratAcc.accuracy)} (${stratAcc.correct}/${stratAcc.total})`.padEnd(22)} ${ensembleTokens.toLocaleString().padEnd(14)} ${`${formatMs(ensembleAvgTime)}/q`.padEnd(12)} $${ensembleCost.toFixed(4)}\n`);
  }

  process.stdout.write('\n');

  // Delta highlights (tokens/cost/time hoisted out of loop since they don't vary by strategy)
  const tokenDelta = ensembleTokens - singleTokens;
  const costDelta = ensembleCost - singleCost;
  const tokenMultiplier = singleTokens > 0 ? ensembleTokens / singleTokens : null;
  const timeDelta = ensembleAvgTime - singleAvgTime;
  const timeMultiplier = singleAvgTime > 0 ? ensembleAvgTime / singleAvgTime : null;

  for (const strategy of strategies) {
    const stratAcc = computeAccuracy(allEnsembleRuns, strategy);
    const accDelta = stratAcc.accuracy - singleAcc.accuracy;
    const accIcon = accDelta > 0 ? ' ✓' : accDelta < 0 ? ' ✗' : '';
    const tokenMultiplierStr = tokenMultiplier !== null ? ` (${tokenMultiplier.toFixed(1)}x)` : '';
    const timeMultiplierStr = timeMultiplier !== null ? ` (${timeMultiplier.toFixed(1)}x)` : '';

    process.stdout.write(`  ${strategy} vs single:\n`);
    process.stdout.write(`    Accuracy: ${toDelta(accDelta)}${accIcon}\n`);
    process.stdout.write(`    Tokens:   ${tokenDelta > 0 ? '+' : ''}${tokenDelta.toLocaleString()}${tokenMultiplierStr}\n`);
    process.stdout.write(`    Time:     ${timeDelta > 0 ? '+' : ''}${formatMs(timeDelta)}/q${timeMultiplierStr}\n`);
    process.stdout.write(`    Cost:     ${costDelta >= 0 ? '+' : ''}$${costDelta.toFixed(4)}${tokenMultiplierStr}\n`);
  }

  process.stdout.write(`\n  Wall clock: ${Math.round(durationMs / 1000)}s\n`);
  process.stdout.write(`${'='.repeat(70)}\n`);
}
