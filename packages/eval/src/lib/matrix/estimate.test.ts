import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ESTIMATE_TOKENS, PRICE_TABLE, getModelPrice } from '@ensemble-ai/shared-utils/pricing';
import { parseMatrixConfig } from './config.js';
import { estimateJob, formatEstimate, totalEstimate } from './estimate.js';
import { planJobs } from './plan.js';
import { endpointsOf } from '../modelSpecs.js';

const config = parseMatrixConfig(
  JSON.parse(readFileSync(resolve(__dirname, '../../../bench/matrix.json'), 'utf8')),
);
const jobs = planJobs(config, { resultsDir: '/tmp/r', runId: 'run', mode: 'free' });
const endpoints = endpointsOf([...config.models.map((m) => m.parsed), config.reference.parsed]);

describe('estimateJob', () => {
  it('prices every committed matrix model from the shared table', () => {
    for (const model of [...config.models, config.reference]) {
      expect(getModelPrice(model.parsed.provider, model.parsed.model, PRICE_TABLE, endpoints).status).toBe('known');
    }
  });

  it('charges one answer per model per question for the reference', () => {
    const reference = jobs.find((j) => j.kind === 'reference')!;
    const estimate = estimateJob({
      job: reference, pending: 10, promptTokens: 100, summarizer: config.summarizer,
      mechanicalStrategies: [], endpoints,
    });
    const price = getModelPrice('openai-compatible', config.reference.parsed.model, PRICE_TABLE, endpoints);
    if (price.status !== 'known') throw new Error('unpriced');
    const perQuestion = (100 * price.inputPerMillion + ESTIMATE_TOKENS.answer.high * price.outputPerMillion) / 1e6;
    expect(estimate.calls).toBe(10);
    expect(estimate.highUsd).toBeCloseTo(10 * perQuestion, 10);
    expect(estimate.unpricedModels).toEqual([]);
  });

  it('adds standard consensus calls but none for a mechanical majority vote', () => {
    const ensemble = jobs.find((j) => j.kind === 'ensemble')!;
    const input = { job: ensemble, pending: 1, promptTokens: 100, summarizer: config.summarizer, endpoints };
    const mechanical = estimateJob({ ...input, mechanicalStrategies: ['majority'] });
    const both = estimateJob({ ...input, mechanicalStrategies: [] });
    expect(mechanical.calls).toBe(4);
    expect(both.calls).toBeGreaterThan(4);
    expect(both.highUsd).toBeGreaterThan(mechanical.highUsd);
  });

  it('costs nothing when no questions are pending', () => {
    const estimate = estimateJob({
      job: jobs[0]!, pending: 0, promptTokens: 100, summarizer: config.summarizer,
      mechanicalStrategies: ['majority'], endpoints,
    });
    expect(estimate.highUsd).toBe(0);
    expect(estimate.calls).toBe(0);
  });
});

describe('the committed matrix', () => {
  it('stays under its budget at the high end with 200 questions and 400-token prompts', () => {
    const total = totalEstimate(jobs.map((job) => estimateJob({
      job, pending: config.sample, promptTokens: 400, summarizer: config.summarizer,
      mechanicalStrategies: ['majority'], endpoints,
    })));
    expect(total.highUsd).toBeLessThan(config.budgetUsd);
    expect(formatEstimate(total, config.budgetUsd)).toMatch(/Total: \d+ calls/);
  });
});

describe('formatEstimate', () => {
  it('warns about unpriced models and an estimate over budget', () => {
    const text = formatEstimate(
      { jobs: [], calls: 1, lowUsd: 1, highUsd: 30, unpricedModels: ['x/y'] },
      20,
    );
    expect(text).toMatch(/No price for: x\/y/);
    expect(text).toMatch(/over the \$20.00 budget/);
  });
});
