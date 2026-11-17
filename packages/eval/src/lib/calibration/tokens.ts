/**
 * Fit estimateRun's token assumptions (shared-utils pricing) from the usage
 * recorded in benchmark results. Output tokens are the billed ones, so hidden
 * reasoning tokens are included where the provider reports them.
 */
import type { TokenCalibration } from '@ensemble-ai/shared-utils/pricing';
import type { BenchmarkResultsFile } from '../../types.js';

/** Nearest-rank percentile of sorted values. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) throw new Error('percentile of no values');
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1]!;
}

export interface TokenFitOptions {
  /** Percentiles for the low and high ends. Default 10 and 90. */
  lowPercentile?: number;
  highPercentile?: number;
  /** Fewest calls needed to fit. Default 20. */
  minCalls?: number;
  source: string;
  now: Date;
}

/**
 * Fit `answer` (output of one answer or one-call synthesis) and `overhead`
 * (consensus instructions: synthesis input less the prompt and the answers
 * it was given). Verdict and critique are not fitted: the matrix runs no
 * ELO or council consensus, so their defaults stay.
 */
export function fitTokenAssumptions(files: BenchmarkResultsFile[], options: TokenFitOptions): TokenCalibration {
  const outputs: number[] = [];
  const overheads: number[] = [];
  let reported = 0;
  let calls = 0;
  for (const file of files) {
    for (const run of file.runs) {
      for (const response of run.responses) {
        if (response.error || !response.usage) continue;
        outputs.push(response.usage.outputTokens);
        calls += 1;
        if (response.usage.source === 'reported') reported += 1;
      }
      const synthesis = run.consensusMetrics?.standard;
      if (synthesis?.calls === 1 && synthesis.outputTokens !== undefined && synthesis.inputTokens !== undefined) {
        outputs.push(synthesis.outputTokens);
        calls += 1;
        const promptTokens = run.responses.find((r) => r.usage)?.usage?.inputTokens ?? Math.ceil(run.prompt.length / 4);
        const given = run.responses
          .filter((r) => !r.error)
          .reduce((sum, r) => sum + Math.ceil(r.content.length / 4), 0);
        overheads.push(Math.max(0, synthesis.inputTokens - promptTokens - given));
      }
    }
  }
  const minCalls = options.minCalls ?? 20;
  if (calls < minCalls) throw new Error(`Only ${calls} calls with recorded usage; need at least ${minCalls}.`);
  outputs.sort((a, b) => a - b);
  overheads.sort((a, b) => a - b);
  const low = Math.max(1, percentile(outputs, options.lowPercentile ?? 10));
  const high = Math.max(low, percentile(outputs, options.highPercentile ?? 90));
  return {
    schemaVersion: 1,
    fittedAt: options.now.toISOString().slice(0, 10),
    source: options.source,
    calls,
    reportedShare: Math.round((reported / calls) * 1000) / 1000,
    tokens: {
      answer: { low, high },
      ...(overheads.length > 0 ? { overhead: percentile(overheads, 50) } : {}),
    },
  };
}

/** The generated shared-utils module (src/pricing/tokenCalibration.ts). */
export function tokenCalibrationModule(calibration: TokenCalibration | null): string {
  return `// Written by \`ensemble-eval calibrate-tokens\` from recorded benchmark usage.
// null means no fit has been committed yet, so estimateRun uses
// DEFAULT_ESTIMATE_TOKENS (see tokenAssumptions.ts).
import type { TokenCalibration } from './tokenAssumptions';

export const TOKEN_CALIBRATION: TokenCalibration | null = ${calibration ? JSON.stringify(calibration, null, 2) : 'null'};
`;
}
