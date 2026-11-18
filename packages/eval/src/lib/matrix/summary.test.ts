import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BenchmarkResultsFile, PromptRunResult } from '../../types.js';
import { parseMatrixConfig, resultKeyOf } from './config.js';
import { forPublication, notRunSummary, referenceFailureReason, summarizeDataset, summarizeMatrix } from './summary.js';

const config = parseMatrixConfig(
  JSON.parse(readFileSync(resolve(__dirname, '../../../bench/matrix.json'), 'utf8')),
  { datasets: ['gsm8k'] },
);
const [qwen, llama, gemma] = config.models;
const result = (correct: boolean, failure?: 'error') => ({
  correct, expected: '1', predicted: correct ? '1' : '2', ...(failure ? { failure } : {}),
});

/** 10 questions: qwen right on 0-7, llama on 0-4, gemma on 0-2, majority on 0-6, standard on 0-8. */
function ensembleFile(): BenchmarkResultsFile {
  const runs: PromptRunResult[] = Array.from({ length: 10 }, (_, i) => ({
    questionId: `q${i}`,
    prompt: `p${i}`,
    responses: config.models.map((m) => ({
      provider: m.parsed.provider, model: m.parsed.model, content: 'x', responseTimeMs: 1,
      estimatedCostUsd: 0.001,
    })),
    consensus: {},
    consensusMetrics: { standard: { tokenCount: 10, durationMs: 1, costUsd: 0.002 } },
    evaluation: {
      evaluator: 'numeric', groundTruth: '1', accuracy: 0,
      results: {
        [resultKeyOf(qwen!)]: result(i < 8),
        [resultKeyOf(llama!)]: result(i < 5, i === 9 ? 'error' : undefined),
        [resultKeyOf(gemma!)]: result(i < 3),
      },
    },
    consensusEvaluation: {
      evaluator: 'numeric', groundTruth: '1',
      results: { majority: result(i < 7), standard: result(i < 9) },
    },
  }));
  return {
    type: 'benchmark', dataset: 'gsm8k', mode: 'mock', models: [], strategies: ['majority', 'standard'],
    sampleSize: 10, createdAt: '', updatedAt: '', runs,
  };
}

function referenceFile(): BenchmarkResultsFile {
  return {
    ...ensembleFile(),
    strategies: [],
    runs: Array.from({ length: 10 }, (_, i) => ({
      questionId: `q${i}`, prompt: `p${i}`, consensus: {},
      responses: [{ provider: 'openai-compatible', model: config.reference.parsed.model, content: 'x', responseTimeMs: 1, estimatedCostUsd: 0.01 }],
      evaluation: { evaluator: 'numeric', groundTruth: '1', accuracy: 0, results: { [resultKeyOf(config.reference)]: result(true) } },
    })),
  };
}

describe('summarizeDataset', () => {
  const summary = summarizeDataset(config, { dataset: 'gsm8k', ensemble: ensembleFile(), reference: referenceFile() });
  const byId = Object.fromEntries(summary.rows.map((r) => [r.id, r]));

  it('reports accuracy with a Wilson interval per configuration', () => {
    expect(summary.rows.map((r) => r.id)).toEqual([
      'single:qwen', 'single:llama', 'single:gemma', 'ensemble:majority', 'ensemble:standard', 'reference',
    ]);
    expect(byId['single:qwen']).toMatchObject({ n: 10, correct: 8, accuracy: 0.8 });
    expect(byId['single:qwen']!.ciLower).toBeLessThan(0.8);
    expect(byId['single:qwen']!.ciUpper).toBeGreaterThan(0.8);
    expect(byId.reference).toMatchObject({ correct: 10, kind: 'reference' });
  });

  it('picks the best single open model and tests every other row against it', () => {
    expect(summary.bestSingleId).toBe('single:qwen');
    expect(byId['single:qwen']!.vsBestSingle).toBeNull();
    // standard right on q8 where qwen was wrong; never the other way.
    expect(byId['ensemble:standard']!.vsBestSingle).toMatchObject({ n10: 0, n01: 1, method: 'exact', n: 10 });
    expect(byId['ensemble:standard']!.vsBestSingle!.pValue).toBe(1);
    expect(byId['single:gemma']!.vsBestSingle).toMatchObject({ n10: 5, n01: 0 });
    expect(byId['single:gemma']!.vsBestSingle!.pValue).toBeCloseTo(0.0625, 6);
  });

  it('counts failures and prices each configuration', () => {
    expect(byId['single:llama']!.failures).toBe(1);
    expect(byId['single:qwen']!.costUsd).toBeCloseTo(0.01, 10);
    expect(byId['ensemble:majority']!.costUsd).toBeCloseTo(0.03, 10);
    expect(byId['ensemble:standard']!.costUsd).toBeCloseTo(0.05, 10);
    expect(byId.reference!.costUsd).toBeCloseTo(0.1, 10);
    expect(summary.spentUsd).toBeCloseTo(0.03 + 0.02 + 0.1, 10);
    expect(summary.spentIncomplete).toBe(false);
    expect(byId['ensemble:standard']!.strategy).toBe('standard');
  });

  it('reports the spend of replaced attempts apart from the configuration costs', () => {
    const file = ensembleFile();
    expect(summary.retrySpendUsd).toBeUndefined();
    file.runs[0]!.priorAttemptCostUsd = 0.004;
    file.runs[1]!.priorAttemptCostUsd = 0.001;
    const s = summarizeDataset(config, { dataset: 'gsm8k', ensemble: file, reference: null });
    expect(s.retrySpendUsd).toBeCloseTo(0.005, 10);
    expect(s.rows.find((r) => r.id === 'single:qwen')!.costUsd).toBeCloseTo(0.01, 10);
  });

  it('marks a cost incomplete when some calls had no price', () => {
    const file = ensembleFile();
    delete file.runs[0]!.responses[0]!.estimatedCostUsd;
    const s = summarizeDataset(config, { dataset: 'gsm8k', ensemble: file, reference: null });
    expect(s.rows.find((r) => r.id === 'single:qwen')!.costIncomplete).toBe(true);
    expect(s.rows.some((r) => r.kind === 'reference')).toBe(false);
    expect(s.spentIncomplete).toBe(true);
    const total = summarizeMatrix(config, [{ dataset: 'gsm8k', ensemble: file, reference: null }], {
      runId: 'r1', mode: 'mock', estimate: null, now: new Date('2026-11-17T12:00:00Z'),
    });
    expect(total.totalCostIncomplete).toBe(true);
  });
});

describe('a reference with failed calls', () => {
  const key = resultKeyOf(config.reference);
  function failedReference(): BenchmarkResultsFile {
    const file = referenceFile();
    file.runs.forEach((run, i) => {
      if (i < 4) return;
      run.responses[0]!.error = i < 8
        ? 'OpenAI-compatible API error: 402 This request requires more credits, or fewer max_tokens.'
        : 'Empty response from anthropic/claude-sonnet-5.5 (finish_reason: content_filter; native_finish_reason: refusal)';
      delete run.responses[0]!.estimatedCostUsd;
      run.evaluation!.results[key] = result(false, 'error');
    });
    return file;
  }
  const summary = summarizeDataset(config, { dataset: 'gsm8k', ensemble: ensembleFile(), reference: failedReference() });

  it('leaves out the reference row and says how many answers came back and why the rest failed', () => {
    expect(summary.rows.some((r) => r.kind === 'reference')).toBe(false);
    expect(summary.referencePending).toEqual({
      answered: 4,
      failed: 6,
      reasons: [{ reason: 'out-of-credit', count: 4 }, { reason: 'refused', count: 2 }],
    });
  });

  it('still counts what the answers that came back cost', () => {
    expect(summary.spentUsd).toBeCloseTo(0.03 + 0.02 + 0.04, 10);
  });

  it('has no note when every reference answer came back', () => {
    const ok = summarizeDataset(config, { dataset: 'gsm8k', ensemble: ensembleFile(), reference: referenceFile() });
    expect(ok.referencePending).toBeUndefined();
  });

  it('keeps the failure reasons out of the published copy', () => {
    const matrix = summarizeMatrix(config, [{ dataset: 'gsm8k', ensemble: ensembleFile(), reference: failedReference() }], {
      runId: 'r1', mode: 'free', estimate: null, now: new Date('2026-11-17T12:00:00Z'),
    });
    const published = forPublication(matrix);
    expect(published.datasets[0]!.referencePending).toEqual({ answered: 4 });
    expect(matrix.datasets[0]!.referencePending!.reasons).toHaveLength(2);
    expect(published.datasets[0]!.rows).toEqual(matrix.datasets[0]!.rows);
  });

  it('classifies stored errors', () => {
    expect(referenceFailureReason('API error: 402 Payment Required')).toBe('out-of-credit');
    expect(referenceFailureReason('finish_reason: content_filter')).toBe('refused');
    expect(referenceFailureReason('fetch failed')).toBe('other');
    expect(referenceFailureReason(undefined)).toBe('other');
  });
});

describe('summarizeMatrix', () => {
  const now = new Date('2026-11-17T12:00:00Z');

  it('is complete when every dataset has full ensemble and reference results', () => {
    const summary = summarizeMatrix(
      config,
      [{ dataset: 'gsm8k', ensemble: ensembleFile(), reference: referenceFile() }],
      { runId: 'r1', mode: 'mock', estimate: null, now },
    );
    expect(summary.status).toBe('complete');
    expect(summary.totalCostUsd).toBeCloseTo(0.15, 10);
    expect(summary.totalCostIncomplete).toBe(false);
    expect(summary.method.models.map((m) => m.id)).toEqual(['qwen', 'llama', 'gemma']);
  });

  it('is partial when a reference is missing', () => {
    const summary = summarizeMatrix(
      config,
      [{ dataset: 'gsm8k', ensemble: ensembleFile(), reference: null }],
      { runId: 'r1', mode: 'mock', estimate: null, now },
    );
    expect(summary.status).toBe('partial');
  });

  it('has a not-run form with the method and estimate but no numbers', () => {
    const summary = notRunSummary(config, { jobs: [], calls: 10, lowUsd: 1, highUsd: 2, unpricedModels: [] }, now);
    expect(summary).toMatchObject({ status: 'not-run', runId: null, datasets: [], totalCostUsd: null, totalCostIncomplete: false });
    expect(summary.estimate).toEqual({ lowUsd: 1, highUsd: 2, calls: 10 });
  });
});
