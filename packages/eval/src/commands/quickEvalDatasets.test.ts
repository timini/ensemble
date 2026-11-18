import { describe, expect, it, vi } from 'vitest';
import { loadQuickEvalDataset, type QuickEvalDatasetDeps } from './quickEvalDatasets.js';
import type { BenchmarkQuestion, ProviderResponse } from '../types.js';

const questions: BenchmarkQuestion[] = ['q1', 'q2', 'q3'].map((id) => ({
  id,
  prompt: `legacy ${id}`,
  groundTruth: 'A',
  multipleChoice: { stem: `Stem ${id}`, choices: ['r', 'w1', 'w2', 'w3'], correctIndex: 0, style: 'dot' as const },
}));

function deps(caches: Partial<Record<'legacy' | 'structured', string[]>>): QuickEvalDatasetDeps {
  return {
    loadCache: vi.fn(
      async (_m: string, _d: string, _n: number, _t: number, protocol: 'legacy' | 'structured' = 'legacy') => {
        const ids = caches[protocol];
        return ids ? new Map<string, ProviderResponse[]>(ids.map((id: string) => [id, []])) : null;
      },
    ),
    loadQuestions: vi.fn(async () => ({ datasetName: 'truthfulqa' as const, questions })),
  };
}

const args = { name: 'truthfulqa' as const, model: 'google:x', ensembleSize: 5, temperature: 0.7, sampleCount: 30, useCache: true };

describe('loadQuickEvalDataset', () => {
  it('scores the committed legacy caches the legacy way, prompts unchanged', async () => {
    const result = await loadQuickEvalDataset(args, deps({ legacy: ['q1', 'q3'] }));
    expect(result.protocol).toBe('legacy');
    expect(result.questions.map((q) => q.id)).toEqual(['q1', 'q3']);
    expect(result.questions[0].prompt).toBe('legacy q1');
    expect(result.questions[0].groundTruth).toBe('A');
  });

  it('prefers a structured cache', async () => {
    const result = await loadQuickEvalDataset(args, deps({ legacy: ['q1'], structured: ['q2'] }));
    expect(result.protocol).toBe('structured');
    expect(result.questions.map((q) => q.id)).toEqual(['q2']);
    expect(result.questions[0].optionPermutation).toBeDefined();
  });

  it('runs live with the structured protocol and a fixed seed when there is no cache', async () => {
    const d = deps({});
    const result = await loadQuickEvalDataset({ ...args, useCache: false }, d);
    expect(result.protocol).toBe('structured');
    expect(d.loadQuestions).toHaveBeenCalledWith('truthfulqa', { sample: 30, seed: 42 });
    expect(d.loadCache).not.toHaveBeenCalled();
  });

  it('limits cached questions to the sample size', async () => {
    const result = await loadQuickEvalDataset({ ...args, sampleCount: 1 }, deps({ legacy: ['q1', 'q2', 'q3'] }));
    expect(result.questions).toHaveLength(1);
  });
});
