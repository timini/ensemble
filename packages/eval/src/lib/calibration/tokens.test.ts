import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BenchmarkResultsFile, PromptRunResult } from '../../types.js';
import { fitTokenAssumptions, percentile, tokenCalibrationModule } from './tokens.js';

const now = new Date('2026-11-17T00:00:00Z');

function runWith(outputs: number[], synthesis?: { input: number; output: number }): PromptRunResult {
  return {
    questionId: 'q', prompt: 'x'.repeat(400), consensus: {},
    responses: outputs.map((out, i) => ({
      provider: 'openai', model: `m${i}`, content: 'y'.repeat(400), responseTimeMs: 1,
      usage: { inputTokens: 100, outputTokens: out, source: i === 0 ? 'estimated' : 'reported' },
    })),
    ...(synthesis
      ? { consensusMetrics: { standard: { tokenCount: 0, durationMs: 0, inputTokens: synthesis.input, outputTokens: synthesis.output, calls: 1 } } }
      : {}),
  };
}

const file = (runs: PromptRunResult[]): BenchmarkResultsFile => ({
  type: 'benchmark', dataset: 'gsm8k', mode: 'mock', models: [], strategies: [], sampleSize: runs.length,
  createdAt: '', updatedAt: '', runs,
});

describe('percentile', () => {
  it('uses the nearest rank', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10)).toBe(1);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
  });
});

describe('fitTokenAssumptions', () => {
  it('fits the answer range and the consensus overhead from recorded usage', () => {
    const runs = Array.from({ length: 10 }, (_, i) => runWith([100 + i * 10, 1000 + i * 100], { input: 100 + 200 + 450, output: 500 }));
    const fit = fitTokenAssumptions([file(runs)], { source: 'results/r1', now });
    expect(fit.calls).toBe(30);
    expect(fit.reportedShare).toBeCloseTo(10 / 30, 3);
    expect(fit.tokens.answer!.low).toBe(120);
    expect(fit.tokens.answer!.high).toBe(1600);
    // 750 input less a 100-token prompt and two 100-token answers.
    expect(fit.tokens.overhead).toBe(450);
    expect(fit.fittedAt).toBe('2026-11-17');
  });

  it('skips failed calls and refuses too little data', () => {
    expect(() => fitTokenAssumptions([file([runWith([1, 2])])], { source: 's', now })).toThrow(/Only 2 calls/);
  });
});

describe('tokenCalibrationModule', () => {
  it('matches the committed module when there is no fit', () => {
    const committed = readFileSync(
      resolve(__dirname, '../../../../shared-utils/src/pricing/tokenCalibration.ts'), 'utf8',
    );
    expect(tokenCalibrationModule(null)).toBe(committed);
  });

  it('writes a fit as a typed constant', () => {
    expect(tokenCalibrationModule({ schemaVersion: 1, fittedAt: 'd', source: 's', calls: 1, reportedShare: 1, tokens: {} }))
      .toMatch(/TOKEN_CALIBRATION: TokenCalibration \| null = \{/);
  });
});
