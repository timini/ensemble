import { loadBenchmarkQuestions } from '../lib/benchmarkDatasets.js';
import { loadEnsembleCache } from '../lib/ensembleCache.js';
import { QUESTION_SEED } from '../lib/evalDefaults.js';
import { prepareQuestions, type AnswerProtocol } from '../lib/methodology.js';
import type { BenchmarkDatasetName, BenchmarkQuestion } from '../types.js';

export interface QuickEvalDataset {
  name: BenchmarkDatasetName;
  protocol: AnswerProtocol;
  questions: BenchmarkQuestion[];
}

export interface QuickEvalDatasetArgs {
  name: BenchmarkDatasetName;
  model: string;
  ensembleSize: number;
  temperature: number;
  sampleCount: number;
  useCache: boolean;
  log?: (line: string) => void;
}

/** Injected for tests. */
export interface QuickEvalDatasetDeps {
  loadCache: typeof loadEnsembleCache;
  loadQuestions: typeof loadBenchmarkQuestions;
}

const defaultDeps: QuickEvalDatasetDeps = {
  loadCache: loadEnsembleCache,
  loadQuestions: loadBenchmarkQuestions,
};

/**
 * Pick the questions and answer protocol for one quick-eval dataset.
 *
 * - A structured ensemble cache wins: structured protocol, cached questions.
 * - Otherwise a legacy cache (the committed ones) is scored the legacy way,
 *   with unshuffled prompts and the LLM judge, since its replies answered
 *   the legacy prompts.
 * - With no cache, a live structured run on a fixed-seed sample.
 */
export async function loadQuickEvalDataset(
  args: QuickEvalDatasetArgs,
  deps: QuickEvalDatasetDeps = defaultDeps,
): Promise<QuickEvalDataset> {
  const { name, model, ensembleSize, temperature, sampleCount, useCache } = args;
  const structuredCache = useCache
    ? await deps.loadCache(model, name, ensembleSize, temperature, 'structured')
    : null;
  const legacyCache = useCache && !structuredCache?.size
    ? await deps.loadCache(model, name, ensembleSize, temperature, 'legacy')
    : null;
  const ensembleCache = structuredCache?.size ? structuredCache : legacyCache;

  if (ensembleCache && ensembleCache.size > 0) {
    const protocol: AnswerProtocol = structuredCache?.size ? 'structured' : 'legacy';
    // Load all questions, then keep the cached ones. The fixed seed gives the same order every run.
    const all = (await deps.loadQuestions(name, { shuffle: true, seed: QUESTION_SEED })).questions;
    const cachedIds = new Set(ensembleCache.keys());
    const sampled = all.filter((q) => cachedIds.has(q.id)).slice(0, sampleCount);
    args.log?.(`  [${name}] ${cachedIds.size} cached questions (${protocol}), using ${sampled.length}\n`);
    return { name, protocol, questions: prepareQuestions(name, sampled, { protocol }) };
  }

  const loaded = (await deps.loadQuestions(name, { sample: sampleCount, seed: QUESTION_SEED })).questions;
  return { name, protocol: 'structured', questions: prepareQuestions(name, loaded, { protocol: 'structured' }) };
}
